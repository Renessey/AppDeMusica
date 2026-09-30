import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import {
  Search,
  X,
  Globe,
  DownloadCloud,
  Play,
  Pause,
  Shuffle,
  MoreVertical,
  ListPlus,
  Heart,
  Trash2,
  Plus,
  Music2,
  HardDrive,
} from 'lucide-react-native';
import { useMusic } from '../context/MusicContext';
import { theme } from '../theme';
import { Song, Playlist } from '../types';
import { formatTime, formatBytes } from '../utils/formatters';

interface MainShelfScreenProps {
  onNavigateToTab: (tabIndex: number) => void;
}

export const MainShelfScreen: React.FC<MainShelfScreenProps> = ({ onNavigateToTab }) => {
  const {
    songs,
    playlists,
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    toggleFavorite,
    deleteSong,
    addSongToPlaylist,
  } = useMusic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongForOptions, setSelectedSongForOptions] = useState<Song | null>(null);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isAddToPlaylistModalVisible, setIsAddToPlaylistModalVisible] = useState(false);

  // Filter songs
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase();
    return songs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }, [songs, searchQuery]);

  // Total storage calculated
  const totalStorage = useMemo(() => {
    return songs.reduce((acc, s) => acc + (s.fileSize || 0), 0);
  }, [songs]);

  const handleSongPress = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlayPause();
    } else {
      playSong(song, filteredSongs);
    }
  };

  const handleOpenOptions = (song: Song) => {
    setSelectedSongForOptions(song);
    setIsOptionsModalVisible(true);
  };

  const handleConfirmDelete = (song: Song) => {
    Alert.alert(
      'Remover Música',
      `Deseja realmente remover "${song.title}" da sua prateleira?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            deleteSong(song.id);
            setIsOptionsModalVisible(false);
          },
        },
      ]
    );
  };

  const handleAddSongToSelectedPlaylist = async (playlist: Playlist) => {
    if (selectedSongForOptions) {
      await addSongToPlaylist(playlist.id, selectedSongForOptions.id);
      setIsAddToPlaylistModalVisible(false);
      setIsOptionsModalVisible(false);
      Alert.alert('Adicionada!', `Música adicionada à playlist "${playlist.name}".`);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredSongs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header / Brand */}
            <View style={styles.header}>
              <View>
                <Text style={styles.logoText}>
                  App<Text style={styles.logoHighlight}>Music</Text>
                </Text>
                <Text style={styles.subLogoText}>Sua Prateleira Musical Pessoal</Text>
              </View>
              <View style={styles.storageBadge}>
                <View style={styles.storageBadgeIconRow}>
                  <HardDrive size={12} color={theme.colors.accentCyan} />
                  <Text style={styles.storageBadgeLabel}>Espaço</Text>
                </View>
                <Text style={styles.storageBadgeValue}>{formatBytes(totalStorage)}</Text>
              </View>
            </View>

            {/* Quick Action Cards */}
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={[styles.quickCard, styles.quickCardYouTube]}
                onPress={() => onNavigateToTab(2)} // YouTube Browser
              >
                <View style={styles.quickCardIconBox}>
                  <Globe size={22} color="#a5b4fc" />
                </View>
                <View style={styles.quickCardTextBox}>
                  <Text style={styles.quickCardTitle}>Navegar no YouTube</Text>
                  <Text style={styles.quickCardSub}>Pesquise e extraia áudios</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, styles.quickCardDownload]}
                onPress={() => onNavigateToTab(3)} // Downloads
              >
                <View style={styles.quickCardIconBox}>
                  <DownloadCloud size={22} color="#6ee7b7" />
                </View>
                <View style={styles.quickCardTextBox}>
                  <Text style={styles.quickCardTitle}>Baixar Música</Text>
                  <Text style={styles.quickCardSub}>Cole links para download</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Search size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrar músicas, artistas..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Highlights Carousel (Top 4 songs) */}
            {songs.length > 0 && !searchQuery && (
              <View style={styles.carouselSection}>
                <Text style={styles.sectionTitle}>Recomendadas & Recentes</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselScroll}
                >
                  {songs.slice(0, 4).map((item) => (
                    <TouchableOpacity
                      key={`carousel_${item.id}`}
                      style={styles.carouselCard}
                      activeOpacity={0.85}
                      onPress={() => handleSongPress(item)}
                    >
                      <Image source={{ uri: item.thumbnail }} style={styles.carouselThumb} />
                      <View style={styles.carouselOverlay} />
                      <View style={styles.carouselInfo}>
                        <Text style={styles.carouselSongTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.carouselSongArtist} numberOfLines={1}>
                          {item.artist}
                        </Text>
                      </View>
                      <View style={styles.carouselPlayButton}>
                        {currentSong?.id === item.id && isPlaying ? (
                          <Pause size={14} color="#fff" />
                        ) : (
                          <Play size={14} color="#fff" fill="#fff" style={styles.playIconOffset} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Prateleira Principal Header */}
            <View style={styles.shelfHeader}>
              <View>
                <Text style={styles.shelfTitle}>Prateleira Principal</Text>
                <Text style={styles.shelfSubtitle}>
                  {filteredSongs.length} {filteredSongs.length === 1 ? 'música' : 'músicas'} disponíveis
                </Text>
              </View>
              <TouchableOpacity
                style={styles.randomPlayBadge}
                onPress={() => {
                  if (songs.length > 0) {
                    const rnd = Math.floor(Math.random() * songs.length);
                    playSong(songs[rnd], songs);
                  }
                }}
              >
                <Shuffle size={13} color={theme.colors.accentLight} />
                <Text style={styles.randomPlayText}>Aleatório</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const isThisPlaying = currentSong?.id === item.id && isPlaying;
          const isThisCurrent = currentSong?.id === item.id;

          return (
            <TouchableOpacity
              style={[styles.songRow, isThisCurrent && styles.songRowActive]}
              activeOpacity={0.75}
              onPress={() => handleSongPress(item)}
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

              <Image source={{ uri: item.thumbnail }} style={styles.songThumbnail} />

              <View style={styles.songDetails}>
                <Text
                  style={[styles.songTitle, isThisCurrent && styles.songTitleActive]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <View style={styles.songSubDetails}>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                  <Text style={styles.songDot}>•</Text>
                  <Text style={styles.songDuration}>{formatTime(item.duration)}</Text>
                  {item.isDownloaded && (
                    <>
                      <Text style={styles.songDot}>•</Text>
                      <Text style={styles.offlineTag}>Offline</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Quick Actions */}
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => handleOpenOptions(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MoreVertical size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Music2 size={44} color={theme.colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Nenhuma música encontrada</Text>
            <Text style={styles.emptySub}>
              Use a aba "YouTube" ou "Baixar" para adicionar novas músicas à sua prateleira!
            </Text>
          </View>
        }
      />

      {/* Options Modal */}
      <Modal
        visible={isOptionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsOptionsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedSongForOptions && (
              <>
                <View style={styles.modalHeader}>
                  <Image
                    source={{ uri: selectedSongForOptions.thumbnail }}
                    style={styles.modalSongThumb}
                  />
                  <View style={styles.modalSongInfo}>
                    <Text style={styles.modalSongTitle} numberOfLines={1}>
                      {selectedSongForOptions.title}
                    </Text>
                    <Text style={styles.modalSongArtist} numberOfLines={1}>
                      {selectedSongForOptions.artist}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setIsAddToPlaylistModalVisible(true);
                  }}
                >
                  <ListPlus size={20} color={theme.colors.textPrimary} style={styles.modalOptionIcon} />
                  <Text style={styles.modalOptionText}>Adicionar à Playlist</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    toggleFavorite(selectedSongForOptions.id);
                    setIsOptionsModalVisible(false);
                  }}
                >
                  <Heart
                    size={20}
                    color={selectedSongForOptions.isFavorite ? theme.colors.accentPink : theme.colors.textPrimary}
                    fill={selectedSongForOptions.isFavorite ? theme.colors.accentPink : 'transparent'}
                    style={styles.modalOptionIcon}
                  />
                  <Text style={styles.modalOptionText}>
                    {selectedSongForOptions.isFavorite ? 'Remover dos Favoritos' : 'Favoritar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => handleConfirmDelete(selectedSongForOptions)}
                >
                  <Trash2 size={20} color={theme.colors.error} style={styles.modalOptionIcon} />
                  <Text style={[styles.modalOptionText, { color: theme.colors.error }]}>
                    Excluir Música
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add To Playlist Modal */}
      <Modal
        visible={isAddToPlaylistModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddToPlaylistModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.playlistSelectModal}>
            <Text style={styles.playlistSelectTitle}>Escolha a Playlist</Text>
            <ScrollView style={styles.playlistScroll}>
              {playlists.map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  style={styles.playlistSelectItem}
                  onPress={() => handleAddSongToSelectedPlaylist(pl)}
                >
                  <Music2 size={18} color={theme.colors.textSecondary} style={styles.playlistSelectIcon} />
                  <View style={styles.playlistItemInfo}>
                    <Text style={styles.playlistSelectName}>{pl.name}</Text>
                    <Text style={styles.playlistSelectCount}>
                      {pl.songIds.length} músicas
                    </Text>
                  </View>
                  <Plus size={20} color={theme.colors.accent} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.playlistSelectCancel}
              onPress={() => setIsAddToPlaylistModalVisible(false)}
            >
              <Text style={styles.playlistSelectCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoHighlight: {
    color: theme.colors.accent,
  },
  subLogoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  storageBadge: {
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'flex-end',
  },
  storageBadgeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storageBadgeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  storageBadgeValue: {
    color: theme.colors.accentCyan,
    fontSize: 13,
    fontWeight: '800',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickCardIconBox: {
    marginRight: 10,
  },
  quickCardTextBox: {
    flex: 1,
  },
  quickCardTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  quickCardSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  carouselSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  carouselScroll: {
    gap: 14,
  },
  carouselCard: {
    width: 170,
    height: 180,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.bgCard,
  },
  carouselThumb: {
    width: '100%',
    height: '100%',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  carouselInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  carouselSongTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  carouselSongArtist: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
  },
  carouselPlayButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconOffset: {
    marginLeft: 2,
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shelfTitle: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  shelfSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  randomPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  randomPlayText: {
    color: theme.colors.accentLight,
    fontSize: 12,
    fontWeight: '700',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
  },
  songRowActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
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
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.bgCard,
    marginLeft: 8,
  },
  songDetails: {
    flex: 1,
    marginLeft: 14,
  },
  songTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  songTitleActive: {
    color: theme.colors.accentLight,
  },
  songSubDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songArtist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    maxWidth: 120,
  },
  songDot: {
    color: theme.colors.textMuted,
    marginHorizontal: 5,
    fontSize: 10,
  },
  songDuration: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  offlineTag: {
    color: theme.colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  moreButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    marginBottom: 12,
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
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.bgCard,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSongThumb: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.sm,
  },
  modalSongInfo: {
    flex: 1,
    marginLeft: 14,
  },
  modalSongTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  modalSongArtist: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalOptionIcon: {
    marginRight: 16,
  },
  modalOptionText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  playlistSelectModal: {
    backgroundColor: theme.colors.bgCard,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: 24,
  },
  playlistSelectTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  playlistSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playlistSelectIcon: {
    marginRight: 12,
  },
  playlistSelectName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  playlistSelectCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  playlistSelectCancel: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.borderRadius.md,
  },
  playlistSelectCancelText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardYouTube: {
    backgroundColor: '#1e1b4b',
  },
  quickCardDownload: {
    backgroundColor: '#064e3b',
  },
  playlistScroll: {
    maxHeight: 300,
  },
  playlistItemInfo: {
    flex: 1,
  },
});
