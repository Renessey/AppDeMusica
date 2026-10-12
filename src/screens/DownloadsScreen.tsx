import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {
  Zap,
  Link2,
  X,
  Download,
  Play,
  CheckCircle2,
  AlertCircle,
  FolderDown,
} from 'lucide-react-native';
import { useMusic } from '../context/MusicContext';
import { useTheme, AppTheme } from '../theme';
import { extractVideoId, fetchYouTubeMetadata } from '../services/youtubeEngine';
import { formatBytes, formatTime } from '../utils/formatters';

interface DownloadsScreenProps {
  onNavigateToYouTube?: (url: string) => void;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = React.memo(({ onNavigateToYouTube }) => {
  const {
    startDownload,
    cancelDownload,
    activeDownloads,
    songs,
    playSong,
  } = useMusic();

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [inputUrl, setInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Filter downloaded offline songs
  const downloadedSongs = songs.filter((s) => s.isDownloaded);
  const downloadEntries = Object.values(activeDownloads);

  const handleStartDownload = async () => {
    if (!inputUrl.trim()) {
      Alert.alert('Link Necessário', 'Por favor insira ou cole o link do YouTube.');
      return;
    }

    const videoId = extractVideoId(inputUrl.trim());
    if (!videoId) {
      Alert.alert('Link Inválido', 'Não foi possível identificar o vídeo do YouTube neste link.');
      return;
    }

    try {
      setIsResolving(true);
      const titleToPass = customTitle.trim() || undefined;
      const artistToPass = customArtist.trim() || undefined;

      setInputUrl('');
      setCustomTitle('');
      setCustomArtist('');

      // Directly trigger download via built-in engine
      await startDownload(videoId, undefined, {
        title: titleToPass,
        artist: artistToPass,
      });
    } catch (e: any) {
      Alert.alert('Erro ao Baixar', e?.message || 'Falha ao processar download do áudio.');
    } finally {
      setIsResolving(false);
    }
  };

  const handlePasteDemo = (url: string) => {
    setInputUrl(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.title}>Motor de Download</Text>
            <Text style={styles.subBrand}>UpperMusic</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Extraia e baixe áudios diretamente para sua prateleira sem intermediários.
        </Text>
      </View>

      {/* Main Download Card */}
      <View style={styles.downloadCard}>
        <Text style={styles.cardHeaderTitle}>Adicionar por Link do YouTube</Text>

        <View style={styles.inputContainer}>
          <Link2 size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Cole o link do YouTube aqui..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
          />
          {inputUrl.length > 0 && (
            <TouchableOpacity onPress={() => setInputUrl('')}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Optional Custom Metadata */}
        <View style={styles.optionalFieldsRow}>
          <TextInput
            style={styles.smallInput}
            placeholder="Título (opcional)"
            placeholderTextColor={theme.colors.textMuted}
            value={customTitle}
            onChangeText={setCustomTitle}
          />
          <TextInput
            style={styles.smallInput}
            placeholder="Artista (opcional)"
            placeholderTextColor={theme.colors.textMuted}
            value={customArtist}
            onChangeText={setCustomArtist}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isResolving && styles.submitButtonDisabled]}
          onPress={handleStartDownload}
          disabled={isResolving}
          activeOpacity={0.85}
        >
          <Download size={18} color="#fff" />
          <Text style={styles.submitButtonText}>
            {isResolving ? 'Extraindo Áudio...' : 'Baixar e Adicionar à Prateleira'}
          </Text>
        </TouchableOpacity>

        {/* Quick Sample Links */}
        <View style={styles.sampleLinksSection}>
          <Text style={styles.sampleLinksTitle}>Exemplos rápidos para testar:</Text>
          <View style={styles.samplePillsRow}>
            <TouchableOpacity
              style={styles.samplePill}
              onPress={() => handlePasteDemo('https://www.youtube.com/watch?v=kJQP7kiw5Fk')}
            >
              <Text style={styles.samplePillText}>🎵 Despacito</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.samplePill}
              onPress={() => handlePasteDemo('https://www.youtube.com/watch?v=fJ9rUzIMcZQ')}
            >
              <Text style={styles.samplePillText}> Bohemian Rhapsody</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Active Downloads List */}
      {downloadEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Downloads em Andamento ({downloadEntries.length})</Text>
          {downloadEntries.map((item) => (
            <View key={item.songId} style={styles.downloadItemCard}>
              <Image source={{ uri: item.thumbnail }} style={styles.downloadThumb} />
              <View style={styles.downloadInfo}>
                <Text style={styles.downloadTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.downloadArtist} numberOfLines={1}>
                  {item.artist}
                </Text>

                {/* Progress bar */}
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
                </View>

                <View style={styles.progressStats}>
                  <View style={styles.progressStatusRow}>
                    {item.status === 'completed' ? (
                      <>
                        <CheckCircle2 size={13} color={theme.colors.success} />
                        <Text style={[styles.progressText, { color: theme.colors.success }]}>
                          Concluído ✓
                        </Text>
                      </>
                    ) : item.status === 'error' ? (
                      <>
                        <AlertCircle size={13} color={theme.colors.error} />
                        <Text style={[styles.progressText, { color: theme.colors.error }]}>
                          Erro no download
                        </Text>
                      </>
                    ) : (
                      <>
                        <Download size={13} color={theme.colors.accentCyan} />
                        <Text style={styles.progressText}>
                          {item.progress}% • {formatBytes(item.bytesRead)} / {formatBytes(item.totalBytes)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {item.status === 'downloading' && (
                <TouchableOpacity
                  style={styles.cancelDownloadBtn}
                  onPress={() => cancelDownload(item.songId)}
                >
                  <X size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Offline Stored Songs */}
      <View style={styles.section}>
        <View style={styles.shelfHeader}>
          <Text style={styles.sectionTitle}>Músicas Armazenadas Offline ({downloadedSongs.length})</Text>
        </View>

        {downloadedSongs.length === 0 ? (
          <View style={styles.emptyOffline}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.emptyOfflineLogo}
              resizeMode="contain"
            />
            <Text style={styles.emptyOfflineText}>
              Nenhuma música baixada offline ainda. Use o campo acima ou o navegador YouTube!
            </Text>
          </View>
        ) : (
          downloadedSongs.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={styles.offlineSongRow}
              activeOpacity={0.8}
              onPress={() => playSong(song, downloadedSongs)}
            >
              <Image
                source={
                  song.thumbnail ? { uri: song.thumbnail } : require('../assets/logo.png')
                }
                style={styles.offlineSongThumb}
              />
              <View style={styles.offlineSongInfo}>
                <Text style={styles.offlineSongTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={styles.offlineSongMeta}>
                  {song.artist} • {formatBytes(song.fileSize)} • {formatTime(song.duration)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.playOfflineBtn}
                onPress={() => playSong(song, downloadedSongs)}
              >
                <Play size={14} color={theme.colors.accent} fill={theme.colors.accent} style={styles.playIconOffset} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  subBrand: {
    color: theme.colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  downloadCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  cardHeaderTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgDark,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  optionalFieldsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  smallInput: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 40,
    color: theme.colors.textPrimary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    height: 48,
    gap: 8,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  sampleLinksSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sampleLinksTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  samplePillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  samplePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  samplePillText: {
    color: theme.colors.accentLight,
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  downloadItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  downloadThumb: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.bgDark,
  },
  downloadInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  downloadTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  downloadArtist: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accentCyan,
  },
  progressStats: {
    marginTop: 4,
  },
  progressStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    color: theme.colors.accentCyan,
    fontSize: 10,
    fontWeight: '700',
  },
  cancelDownloadBtn: {
    padding: 8,
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyOffline: {
    backgroundColor: theme.colors.bgCard,
    padding: 24,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  emptyOfflineLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginBottom: 12,
  },
  emptyOfflineText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  offlineSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  offlineSongThumb: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
  },
  offlineSongInfo: {
    flex: 1,
    marginLeft: 12,
  },
  offlineSongTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  offlineSongMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  playOfflineBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  playIconOffset: {
    marginLeft: 2,
  },
  });
