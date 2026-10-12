import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  Plus,
  ArrowLeft,
  Trash2,
  Play,
  Shuffle,
  X,
  Music2,
  ChevronRight,
  FolderHeart,
} from 'lucide-react-native';
import { useMusic } from '../context/MusicContext';
import { useTheme, AppTheme } from '../theme';
import { Playlist, Song } from '../types';
import { formatTime } from '../utils/formatters';

export const PlaylistsScreen: React.FC = React.memo(() => {
  const {
    playlists,
    songs,
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    createPlaylist,
    deletePlaylist,
    removeSongFromPlaylist,
  } = useMusic();

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Nome Obrigatório', 'Por favor insira um nome para a playlist.');
      return;
    }
    await createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setIsCreateModalVisible(false);
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Excluir Playlist',
      `Deseja realmente excluir a playlist "${playlist.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deletePlaylist(playlist.id);
            if (selectedPlaylist?.id === playlist.id) {
              setSelectedPlaylist(null);
            }
          },
        },
      ]
    );
  };

  const getPlaylistSongs = (playlist: Playlist): Song[] => {
    return playlist.songIds
      .map((id) => songs.find((s) => s.id === id))
      .filter((s): s is Song => !!s);
  };

  // If a playlist is selected, render Playlist Detail Screen
  if (selectedPlaylist) {
    const activePlaylist = playlists.find((p) => p.id === selectedPlaylist.id) || selectedPlaylist;
    const playlistSongs = getPlaylistSongs(activePlaylist);
    const totalDuration = playlistSongs.reduce((acc, s) => acc + (s.duration || 0), 0);

    return (
      <View style={styles.container}>
        <FlatList
          data={playlistSongs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.detailContent}
          ListHeaderComponent={
            <View>
              {/* Back Bar */}
              <View style={styles.detailNav}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedPlaylist(null)}
                >
                  <ArrowLeft size={20} color={theme.colors.accent} />
                  <Text style={styles.backText}>Playlists</Text>
                </TouchableOpacity>

                {!activePlaylist.isSystem && (
                  <TouchableOpacity
                    style={styles.deletePlButton}
                    onPress={() => handleDeletePlaylist(activePlaylist)}
                  >
                    <Trash2 size={15} color={theme.colors.error} />
                    <Text style={styles.deletePlText}>Excluir</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Playlist Banner */}
              <View style={styles.detailHeader}>
                <Image
                  source={
                    activePlaylist.coverUrl
                      ? { uri: activePlaylist.coverUrl }
                      : playlistSongs[0]?.thumbnail
                      ? { uri: playlistSongs[0]?.thumbnail }
                      : require('../assets/logo.png')
                  }
                  style={styles.detailCover}
                />
                <Text style={styles.detailTitle}>{activePlaylist.name}</Text>
                {activePlaylist.description ? (
                  <Text style={styles.detailDescription}>{activePlaylist.description}</Text>
                ) : null}
                <Text style={styles.detailMeta}>
                  {playlistSongs.length} {playlistSongs.length === 1 ? 'música' : 'músicas'} •{' '}
                  {formatTime(totalDuration)}
                </Text>

                {/* Play and Shuffle buttons */}
                {playlistSongs.length > 0 && (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.playAllButton}
                      onPress={() => playSong(playlistSongs[0], playlistSongs)}
                    >
                      <Play size={15} color="#fff" fill="#fff" />
                      <Text style={styles.playAllText}>Tocar Tudo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shuffleAllButton}
                      onPress={() => {
                        const rnd = Math.floor(Math.random() * playlistSongs.length);
                        playSong(playlistSongs[rnd], playlistSongs);
                      }}
                    >
                      <Shuffle size={16} color={theme.colors.textPrimary} />
                      <Text style={styles.shuffleAllText}>Aleatório</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const isThisPlaying = currentSong?.id === item.id && isPlaying;
            const isThisCurrent = currentSong?.id === item.id;

            return (
              <View style={[styles.songRow, isThisCurrent && styles.songRowActive]}>
                <TouchableOpacity
                  style={styles.songMainTouchable}
                  onPress={() => {
                    if (isThisCurrent) togglePlayPause();
                    else playSong(item, playlistSongs);
                  }}
                >
                  <View style={styles.songIndexBox}>
                    {isThisPlaying ? (
                      <Music2 size={15} color={theme.colors.accent} />
                    ) : (
                      <Text style={[styles.songIndex, isThisCurrent && styles.songIndexActive]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Image
                    source={item.thumbnail ? { uri: item.thumbnail } : require('../assets/logo.png')}
                    style={styles.songThumbnail}
                  />
                  <View style={styles.songDetails}>
                    <Text
                      style={[styles.songTitle, isThisCurrent && styles.songTitleActive]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {item.artist} • {formatTime(item.duration)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeSongBtn}
                  onPress={() => removeSongFromPlaylist(activePlaylist.id, item.id)}
                >
                  <X size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.emptyLogo}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>Esta playlist está vazia</Text>
              <Text style={styles.emptySub}>
                Volte à prateleira principal e use o menu (⋮) nas músicas para adicioná-las aqui!
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  // Playlists List View
  return (
    <View style={styles.container}>
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerBrandRow}>
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.title}>Playlists</Text>
                  <Text style={styles.subtitle}>Suas coleções personalizadas</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setIsCreateModalVisible(true)}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.createButtonText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const count = item.songIds.length;
          return (
            <TouchableOpacity
              style={styles.playlistCard}
              activeOpacity={0.85}
              onPress={() => setSelectedPlaylist(item)}
            >
              <Image
                source={item.coverUrl ? { uri: item.coverUrl } : require('../assets/logo.png')}
                style={styles.playlistCover}
              />
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.playlistDesc} numberOfLines={1}>
                  {item.description || 'Playlist de músicas'}
                </Text>
                <View style={styles.playlistMetaRow}>
                  <Text style={styles.playlistSongsCount}>
                    {count} {count === 1 ? 'música' : 'músicas'}
                  </Text>
                  {item.isSystem && <Text style={styles.systemBadge}>Sistema</Text>}
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          );
        }}
      />

      {/* Create Playlist Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.createModalContent}>
            <Text style={styles.createModalTitle}>Nova Playlist</Text>

            <TextInput
              style={styles.createInput}
              placeholder="Nome da Playlist (ex: Treino Pesado)"
              placeholderTextColor={theme.colors.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />

            <TextInput
              style={styles.createInputMultiline}
              placeholder="Descrição opcional..."
              placeholderTextColor={theme.colors.textMuted}
              value={newPlaylistDesc}
              onChangeText={setNewPlaylistDesc}
              multiline
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate}>
                <Text style={styles.confirmBtnText}>Criar Playlist</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerBrandRow: {
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
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.bgDark,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 14,
  },
  playlistName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  playlistDesc: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  playlistMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistSongsCount: {
    color: theme.colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
  },
  systemBadge: {
    color: theme.colors.textMuted,
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  // Detail Styles
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  detailNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  deletePlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: theme.borderRadius.sm,
  },
  deletePlText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailCover: {
    width: 140,
    height: 140,
    borderRadius: theme.borderRadius.xl,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    marginBottom: 16,
  },
  detailTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  detailDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  detailMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    gap: 8,
  },
  playAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  shuffleAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    gap: 8,
  },
  shuffleAllText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.md,
    marginBottom: 4,
  },
  songRowActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  songIndexBox: {
    width: 22,
    alignItems: 'center',
  },
  songIndex: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  songIndexActive: {
    color: theme.colors.accent,
  },
  songThumbnail: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    marginLeft: 8,
  },
  songDetails: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  songTitleActive: {
    color: theme.colors.accentLight,
  },
  songArtist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  removeSongBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyLogo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  createModalContent: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  createModalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  createInput: {
    backgroundColor: theme.colors.bgDark,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  songMainTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createInputMultiline: {
    backgroundColor: theme.colors.bgDark,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  });
