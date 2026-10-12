import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import WebView from 'react-native-webview';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  RotateCw,
  Search,
  X,
  Download,
  ListPlus,
  Plus,
  Music,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { useMusic } from '../context/MusicContext';
import { useTheme, AppTheme } from '../theme';
import { YOUTUBE_INJECTED_JS, extractVideoId, fetchYouTubeMetadata } from '../services/youtubeEngine';
import { Playlist } from '../types';

const NativeWebView = WebView as any;

interface DetectedVideo {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl?: string;
  duration?: number;
}

interface YouTubeBrowserScreenProps {
  initialUrl?: string | null;
}

export const YouTubeBrowserScreen: React.FC<YouTubeBrowserScreenProps> = React.memo(({ initialUrl }) => {
  const { startDownload, playlists, createPlaylist } = useMusic();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const webViewRef = useRef<WebView>(null);

  const [currentUrl, setCurrentUrl] = useState(initialUrl || 'https://m.youtube.com');
  const [inputUrl, setInputUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedVideo, setDetectedVideo] = useState<DetectedVideo | null>(null);

  useEffect(() => {
    if (initialUrl && initialUrl !== currentUrl) {
      setCurrentUrl(initialUrl);
      setInputUrl(initialUrl);
      webViewRef.current?.injectJavaScript(`window.location.href = "${initialUrl}"; true;`);
    }
  }, [initialUrl]);

  // Modal & Resolution State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  // Pending resolver for on-demand audio stream capture
  const pendingResolveRef = useRef<{
    videoId: string;
    resolve: (streamUrl: string) => void;
  } | null>(null);

  // Helper to fetch authentic title/artist via oEmbed
  const enrichMetadata = async (videoId: string) => {
    try {
      const meta = await fetchYouTubeMetadata(videoId);
      if (meta && meta.title && !meta.title.startsWith('Música (')) {
        setDetectedVideo((prev) => {
          if (!prev || prev.videoId !== videoId) return prev;
          return {
            ...prev,
            title: meta.title,
            artist: meta.artist,
            thumbnail: meta.thumbnail || prev.thumbnail,
          };
        });
      }
    } catch {
      // ignore
    }
  };

  const handleSearchOrNavigate = () => {
    if (!inputUrl.trim()) return;
    const trimmed = inputUrl.trim();

    let target = trimmed;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      target = trimmed;
    } else {
      const videoId = extractVideoId(trimmed);
      if (videoId && trimmed.length === 11) {
        target = `https://m.youtube.com/watch?v=${videoId}`;
      } else {
        target = `https://m.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
      }
    }

    setCurrentUrl(target);
    webViewRef.current?.injectJavaScript(`window.location.href = "${target}"; true;`);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'VIDEO_DETECTED') {
        const vid = data.videoId;
        setDetectedVideo((prev) => {
          const keepStream = prev && prev.videoId === vid ? prev.streamUrl : data.streamUrl;
          const currentTitle =
            data.title &&
            data.title !== 'YouTube' &&
            data.title !== 'Vídeo Detectado' &&
            data.title.indexOf('Carregando') === -1
              ? data.title
              : prev && prev.videoId === vid && prev.title !== 'Vídeo Detectado'
              ? prev.title
              : 'Carregando música...';
          const currentArtist =
            data.artist && data.artist !== 'YouTube'
              ? data.artist
              : prev && prev.videoId === vid && prev.artist !== 'YouTube'
              ? prev.artist
              : 'YouTube';

          return {
            videoId: vid,
            title: currentTitle,
            artist: currentArtist,
            thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            streamUrl: keepStream,
            duration: data.duration || (prev && prev.duration) || undefined,
          };
        });
        enrichMetadata(vid);
      } else if (data.type === 'STREAM_FOUND') {
        const vid = data.videoId;
        setDetectedVideo((prev) => {
          const keepTitle =
            prev &&
            prev.videoId === vid &&
            prev.title &&
            prev.title !== 'Vídeo Detectado' &&
            prev.title.indexOf('Carregando') === -1
              ? prev.title
              : data.title || 'Música do YouTube';
          const keepArtist =
            prev && prev.videoId === vid && prev.artist && prev.artist !== 'YouTube'
              ? prev.artist
              : data.artist || 'YouTube';

          return {
            videoId: vid,
            title: keepTitle,
            artist: keepArtist,
            thumbnail:
              (prev && prev.videoId === vid && prev.thumbnail) ||
              data.thumbnail ||
              `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            streamUrl: data.streamUrl,
            duration: (prev && prev.duration) || undefined,
          };
        });

        // Fulfill pending promise if waiting for this video's stream
        if (pendingResolveRef.current && pendingResolveRef.current.videoId === vid) {
          pendingResolveRef.current.resolve(data.streamUrl);
          pendingResolveRef.current = null;
        }
      }
    } catch {
      // ignore non-json messages
    }
  };

  const ensureStreamUrl = async (vid: string): Promise<string | undefined> => {
    if (detectedVideo && detectedVideo.videoId === vid && detectedVideo.streamUrl) {
      return detectedVideo.streamUrl;
    }

    setIsExtractingAudio(true);
    // Request WebView to trigger buffering and audio interception, passing the target videoId
    webViewRef.current?.injectJavaScript(`
      if (window.__REQUEST_AUDIO_STREAM) {
        window.__REQUEST_AUDIO_STREAM("${vid}");
      }
      true;
    `);

    try {
      const stream = await new Promise<string>((resolve, reject) => {
        pendingResolveRef.current = { videoId: vid, resolve };
        setTimeout(() => {
          if (pendingResolveRef.current?.videoId === vid) {
            pendingResolveRef.current = null;
            reject(new Error('TIMEOUT'));
          }
        }, 6000);
      });

      if (stream) {
        setDetectedVideo((prev) => {
          if (prev && prev.videoId === vid) {
            return { ...prev, streamUrl: stream };
          }
          return prev;
        });
      }

      return stream;
    } catch {
      return undefined;
    } finally {
      setIsExtractingAudio(false);
    }
  };

  // Download directly to main shelf
  const handleDownloadToShelf = async () => {
    if (!detectedVideo) return;
    const target = { ...detectedVideo };
    setIsModalOpen(false);

    let stream = target.streamUrl;
    if (!stream) {
      try {
        stream = await Promise.race([
          ensureStreamUrl(target.videoId),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1500)),
        ]);
      } catch {
        stream = undefined;
      }
    }

    startDownload(
      target.videoId,
      stream || undefined,
      {
        title: target.title,
        artist: target.artist,
        thumbnail: target.thumbnail,
        duration: target.duration,
      }
    );
  };

  // Download and add directly to chosen playlist
  const handleDownloadToPlaylist = async (playlist: Playlist) => {
    if (!detectedVideo) return;
    const target = { ...detectedVideo };
    setIsModalOpen(false);

    let stream = target.streamUrl;
    if (!stream) {
      try {
        stream = await Promise.race([
          ensureStreamUrl(target.videoId),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1500)),
        ]);
      } catch {
        stream = undefined;
      }
    }

    startDownload(
      target.videoId,
      stream || undefined,
      {
        title: target.title,
        artist: target.artist,
        thumbnail: target.thumbnail,
        duration: target.duration,
      },
      playlist.id
    );
  };

  // Create playlist and download to it
  const handleCreateAndDownload = async () => {
    if (!newPlaylistName.trim() || !detectedVideo) {
      Alert.alert('Nome da Playlist', 'Por favor digite o nome da playlist.');
      return;
    }
    const created = await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    handleDownloadToPlaylist(created);
  };

  return (
    <View style={styles.container}>
      {/* Top Browser Bar */}
      <View style={styles.browserHeader}>
        <View style={styles.navControls}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={[styles.navBtn, !canGoBack && styles.navBtnDisabled]}
            disabled={!canGoBack}
            onPress={() => webViewRef.current?.goBack()}
          >
            <ChevronLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
            disabled={!canGoForward}
            onPress={() => webViewRef.current?.goForward()}
          >
            <ChevronRight size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => {
              setCurrentUrl('https://m.youtube.com');
              webViewRef.current?.injectJavaScript(`window.location.href = "https://m.youtube.com"; true;`);
            }}
          >
            <Home size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => webViewRef.current?.reload()}
          >
            <RotateCw size={17} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* URL / Search Input */}
        <View style={styles.urlInputContainer}>
          <Search size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.urlInput}
            placeholder="Pesquisar música ou colar URL..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputUrl}
            onChangeText={setInputUrl}
            onSubmitEditing={handleSearchOrNavigate}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {inputUrl.length > 0 && (
            <TouchableOpacity onPress={() => setInputUrl('')}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.goBtn} onPress={handleSearchOrNavigate}>
            <Text style={styles.goBtnText}>Ir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Bar */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
        </View>
      )}

      {/* Embedded YouTube WebView */}
      <View style={styles.webViewContainer}>
        <NativeWebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          injectedJavaScriptBeforeContentLoaded={YOUTUBE_INJECTED_JS}
          injectedJavaScript={YOUTUBE_INJECTED_JS}
          onMessage={handleMessage}
          onNavigationStateChange={(navState: any) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
            setIsLoading(navState.loading);

            if (navState.url && navState.url.startsWith('http')) {
              setCurrentUrl(navState.url);
            }

            const id = extractVideoId(navState.url);
            if (id) {
              setDetectedVideo((prev) => {
                if (prev && prev.videoId === id) return prev;
                return {
                  videoId: id,
                  title: 'Carregando música...',
                  artist: 'YouTube',
                  thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                };
              });
              enrichMetadata(id);
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
          style={styles.webView}
        />
      </View>

      {/* Floating Action Button / Dock when a video is open */}
      {detectedVideo && (
        <View style={styles.floatingActionDock}>
          <Image
            source={
              detectedVideo.thumbnail
                ? { uri: detectedVideo.thumbnail }
                : require('../assets/logo.png')
            }
            style={styles.dockThumb}
          />
          <View style={styles.dockInfo}>
            <View style={styles.dockTagRow}>
              <Sparkles
                size={11}
                color={detectedVideo.streamUrl ? theme.colors.accentCyan : theme.colors.accentLight}
              />
              <Text
                style={[
                  styles.dockBadge,
                  detectedVideo.streamUrl && { color: theme.colors.accentCyan },
                ]}
              >
                {detectedVideo.streamUrl ? 'ÁUDIO PRONTO' : 'MÚSICA DETECTADA'}
              </Text>
            </View>
            <Text style={styles.dockTitle} numberOfLines={1}>
              {detectedVideo.title}
            </Text>
            <Text style={styles.dockSub} numberOfLines={1}>
              {detectedVideo.artist}
            </Text>
          </View>

          {/* Action Trigger Button */}
          <TouchableOpacity
            style={styles.dockDownloadBtn}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.85}
          >
            <Download size={18} color="#fff" />
            <Text style={styles.dockDownloadText}>Baixar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Interactive Modal: Download or Add to Playlist */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalTopBar}>
              <Text style={styles.modalHeading}>Opções de Download ⚡</Text>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {detectedVideo && (
              <View style={styles.videoCardPreview}>
                <Image
                  source={{ uri: detectedVideo.thumbnail }}
                  style={styles.previewThumb}
                />
                <View style={styles.previewMeta}>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {detectedVideo.title}
                  </Text>
                  <Text style={styles.previewArtist} numberOfLines={1}>
                    {detectedVideo.artist}
                  </Text>
                  <Text style={styles.previewFormat}>
                    {detectedVideo.streamUrl
                      ? '✓ Áudio original pronto para download'
                      : '⚡ Extração de áudio original do YouTube'}
                  </Text>
                </View>
              </View>
            )}

            {isExtractingAudio && (
              <View style={styles.extractingBanner}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.extractingBannerText}>
                  Extraindo áudio original do YouTube...
                </Text>
              </View>
            )}

            <View style={styles.optionsDivider} />

            {/* Option 1: Baixar para Prateleira Principal */}
            <TouchableOpacity
              style={[styles.actionCard, isExtractingAudio && { opacity: 0.6 }]}
              disabled={isExtractingAudio}
              activeOpacity={0.8}
              onPress={handleDownloadToShelf}
            >
              <View style={styles.actionCardIconBox}>
                <Download size={22} color={theme.colors.accent} />
              </View>
              <View style={styles.actionCardTextBox}>
                <Text style={styles.actionCardTitle}>Baixar para a Prateleira</Text>
                <Text style={styles.actionCardDesc}>
                  Salva direto na sua prateleira principal e na memória offline.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2 Header: Baixar e Adicionar a Playlist */}
            <View style={styles.playlistSectionHeader}>
              <View style={styles.playlistHeaderLeft}>
                <ListPlus size={18} color={theme.colors.accentCyan} />
                <Text style={styles.playlistSectionTitle}>
                  Ou Baixar Direto em uma Playlist:
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addPlaylistQuickBtn}
                onPress={() => setIsCreatingPlaylist((prev) => !prev)}
              >
                <Plus size={14} color={theme.colors.accentLight} />
                <Text style={styles.addPlaylistQuickText}>Nova</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Create Playlist Input */}
            {isCreatingPlaylist && (
              <View style={styles.quickCreateBox}>
                <TextInput
                  style={styles.quickCreateInput}
                  placeholder="Nome da nova playlist..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.quickCreateSubmit}
                  onPress={handleCreateAndDownload}
                >
                  <Check size={16} color="#fff" />
                  <Text style={styles.quickCreateSubmitText}>Criar e Baixar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Playlists List */}
            <ScrollView style={styles.playlistsScrollView}>
              {playlists.map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  style={[styles.playlistItemRow, isExtractingAudio && { opacity: 0.6 }]}
                  disabled={isExtractingAudio}
                  activeOpacity={0.75}
                  onPress={() => handleDownloadToPlaylist(pl)}
                >
                  <View style={styles.playlistItemIconBox}>
                    <Music size={16} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.playlistItemDetails}>
                    <Text style={styles.playlistItemName} numberOfLines={1}>
                      {pl.name}
                    </Text>
                    <Text style={styles.playlistItemCount}>
                      {pl.songIds.length} músicas
                    </Text>
                  </View>
                  <View style={styles.downloadHereBadge}>
                    <Download size={14} color={theme.colors.accentCyan} />
                    <Text style={styles.downloadHereText}>Baixar Aqui</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  browserHeader: {
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgDark,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  goBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    marginLeft: 6,
  },
  goBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBar: {
    height: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
  },
  floatingActionDock: {
    position: 'absolute',
    bottom: 80,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(18, 24, 38, 0.96)',
    borderRadius: theme.borderRadius.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  dockThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.bgDark,
  },
  dockInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  dockTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dockBadge: {
    color: theme.colors.accentCyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dockTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  dockSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  dockDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  dockDownloadText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.bgCard,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  videoCardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  previewThumb: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.bgDark,
  },
  previewMeta: {
    flex: 1,
    marginLeft: 12,
  },
  previewTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  previewArtist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  previewFormat: {
    color: theme.colors.accentCyan,
    fontSize: 10,
    fontWeight: '600',
  },
  optionsDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 16,
  },
  actionCardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionCardTextBox: {
    flex: 1,
  },
  actionCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionCardDesc: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  playlistSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  playlistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playlistSectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  addPlaylistQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  addPlaylistQuickText: {
    color: theme.colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
  },
  quickCreateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  quickCreateInput: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 38,
    color: theme.colors.textPrimary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickCreateSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  quickCreateSubmitText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  playlistsScrollView: {
    maxHeight: 200,
  },
  playlistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playlistItemIconBox: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistItemDetails: {
    flex: 1,
  },
  playlistItemName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  playlistItemCount: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  downloadHereBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  downloadHereText: {
    color: theme.colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
  },
  extractingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  extractingBannerText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  });
