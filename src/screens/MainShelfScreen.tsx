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
  Play,
  Pause,
  Shuffle,
  MoreVertical,
  ListPlus,
  Heart,
  Trash2,
  Plus,
  Music2,
  Settings,
  HardDrive,
  Sun,
  Moon,
  Check,
  Disc,
} from 'lucide-react-native';
import { useMusic } from '../context/MusicContext';
import { useTheme, AppTheme } from '../theme';
import { Song, Playlist } from '../types';
import { formatTime, formatBytes } from '../utils/formatters';

interface MainShelfScreenProps {
  onNavigateToTab: (tabIndex: number) => void;
}

export const MainShelfScreen: React.FC<MainShelfScreenProps> = React.memo(({ onNavigateToTab }) => {
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

  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongForOptions, setSelectedSongForOptions] = useState<Song | null>(null);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isAddToPlaylistModalVisible, setIsAddToPlaylistModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

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
            {/* Header / Brand & Settings Icon */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.logoText}>
                    Upper<Text style={styles.logoHighlight}>Music</Text>
                  </Text>
                  <Text style={styles.subLogoText}>Sua Prateleira Musical Pessoal</Text>
                </View>
              </View>

              {/* Settings Button (Replaced storage badge as requested) */}
              <TouchableOpacity
                style={styles.settingsButton}
                activeOpacity={0.8}
                onPress={() => setIsSettingsModalVisible(true)}
              >
                <Settings size={22} color={theme.colors.textPrimary} />
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
                <View style={styles.songSubDetails}>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                  <Text style={styles.songDot}>•</Text>
                  <Text style={styles.songDuration}>{formatTime(item.duration)}</Text>
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
            <Image
              source={require('../assets/logo.png')}
              style={styles.emptyLogo}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Nenhuma música encontrada</Text>
            <Text style={styles.emptySub}>
              Use a aba "YouTube" ou "Baixar" para adicionar novas músicas à sua prateleira!
            </Text>
          </View>
        }
      />

      {/* Settings Modal (Shows storage consumption & Light/Dark Theme toggle) */}
      <Modal
        visible={isSettingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={styles.settingsModalBackdrop}>
          <View style={styles.settingsModalContent}>
            {/* Header */}
            <View style={styles.settingsHeader}>
              <View>
                <Text style={styles.settingsTitle}>Configurações</Text>
                <Text style={styles.settingsSubtitle}>UpperMusic • Preferências</Text>
              </View>
              <TouchableOpacity
                style={styles.settingsCloseBtn}
                onPress={() => setIsSettingsModalVisible(false)}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Storage Consumption Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Armazenamento do Dispositivo</Text>
              <View style={styles.storageCard}>
                <View style={styles.storageIconBox}>
                  <HardDrive size={24} color={theme.colors.accentCyan} />
                </View>
                <View style={styles.storageDetails}>
                  <Text style={styles.storageLabel}>Espaço Consumido pelas Músicas</Text>
                  <Text style={styles.storageValue}>{formatBytes(totalStorage)}</Text>
                  <Text style={styles.storageSubText}>
                    {songs.length} {songs.length === 1 ? 'faixa salva' : 'faixas salvas'} na memória
                  </Text>
                </View>
              </View>
            </View>

            {/* Appearance / Theme Mode Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Aparência do Aplicativo</Text>
              <View style={styles.themeToggleContainer}>
                {/* Dark Option */}
                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    themeMode === 'dark' && styles.themeOptionBtnActive,
                  ]}
                  onPress={() => setThemeMode('dark')}
                  activeOpacity={0.8}
                >
                  <Moon
                    size={20}
                    color={themeMode === 'dark' ? '#fff' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      themeMode === 'dark' && styles.themeOptionTextActive,
                    ]}
                  >
                    Tema Escuro
                  </Text>
                  {themeMode === 'dark' && <Check size={16} color="#fff" />}
                </TouchableOpacity>

                {/* Light Option */}
                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    themeMode === 'light' && styles.themeOptionBtnActive,
                  ]}
                  onPress={() => setThemeMode('light')}
                  activeOpacity={0.8}
                >
                  <Sun
                    size={20}
                    color={themeMode === 'light' ? '#fff' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      themeMode === 'light' && styles.themeOptionTextActive,
                    ]}
                  >
                    Tema Claro
                  </Text>
                  {themeMode === 'light' && <Check size={16} color="#fff" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* App Footer Info */}
            <View style={styles.settingsFooter}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.settingsFooterLogo}
                resizeMode="contain"
              />
              <Text style={styles.settingsFooterText}>
                UpperMusic • Versão 1.0.0
              </Text>
            </View>
          </View>
        </View>
      </Modal>

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
                    source={
                      selectedSongForOptions.thumbnail
                        ? { uri: selectedSongForOptions.thumbnail }
                        : require('../assets/logo.png')
                    }
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
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerLogo: {
      width: 44,
      height: 44,
      borderRadius: 12,
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
    settingsButton: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.bgCard,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
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
      backgroundColor: theme.colors.activeRowBg,
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
      maxWidth: 160,
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
    moreButton: {
      padding: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 50,
    },
    emptyLogo: {
      width: 76,
      height: 76,
      borderRadius: 18,
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
      paddingHorizontal: 20,
    },

    // Settings Modal Styles
    settingsModalBackdrop: {
      flex: 1,
      backgroundColor: theme.colors.modalOverlay,
      justifyContent: 'flex-end',
    },
    settingsModalContent: {
      backgroundColor: theme.colors.bgCard,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    settingsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    settingsTitle: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    settingsSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    settingsCloseBtn: {
      padding: 6,
    },
    settingsSection: {
      marginBottom: 22,
    },
    settingsSectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    storageCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardItemBg,
      padding: 16,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    storageIconBox: {
      width: 46,
      height: 46,
      borderRadius: theme.borderRadius.md,
      backgroundColor: 'rgba(6, 182, 212, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    storageDetails: {
      flex: 1,
    },
    storageLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    storageValue: {
      color: theme.colors.accentCyan,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 2,
    },
    storageSubText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    themeToggleContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    themeOptionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardItemBg,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    themeOptionBtnActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    themeOptionText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    themeOptionTextActive: {
      color: '#fff',
    },
    settingsFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    settingsFooterLogo: {
      width: 22,
      height: 22,
      borderRadius: 6,
    },
    settingsFooterText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },

    // Standard Options & Playlist Modals
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.colors.modalOverlay,
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
      maxHeight: '70%',
    },
    playlistSelectTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 16,
    },
    playlistScroll: {
      maxHeight: 280,
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
    playlistItemInfo: {
      flex: 1,
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
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 12,
    },
    playlistSelectCancelText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
