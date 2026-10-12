import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
} from 'lucide-react-native';
import { useMusic } from '../context/MusicContext';
import { useTheme, AppTheme } from '../theme';
import { formatTime } from '../utils/formatters';

const { width } = Dimensions.get('window');
const ALBUM_SIZE = width - 64;

export const FullScreenPlayer: React.FC = React.memo(() => {
  const {
    currentSong,
    isPlaying,
    position,
    duration,
    isShuffle,
    repeatMode,
    isPlayerModalVisible,
    closePlayerModal,
    togglePlayPause,
    seekTo,
    nextSong,
    previousSong,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
  } = useMusic();

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Reaction Animation State
  const heartScaleAnim = useRef(new Animated.Value(1)).current;
  const [reactionText, setReactionText] = useState<string | null>(null);
  const toastOpacityAnim = useRef(new Animated.Value(0)).current;
  const toastTranslateAnim = useRef(new Animated.Value(10)).current;

  if (!currentSong) return null;

  const progress = duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0;

  const handleProgressBarPress = (e: any) => {
    const { locationX } = e.nativeEvent;
    const barWidth = width - 64;
    const ratio = Math.max(0, Math.min(locationX / barWidth, 1));
    const targetSeconds = ratio * duration;
    seekTo(targetSeconds);
  };

  const handleFavoriteClick = () => {
    const willBeFavorite = !currentSong.isFavorite;

    // Heart bounce animation
    Animated.sequence([
      Animated.timing(heartScaleAnim, {
        toValue: 1.45,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.spring(heartScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger context toggle
    toggleFavorite(currentSong.id);

    // Show visual reaction toast
    setReactionText(willBeFavorite ? 'Adicionada às Favoritas ❤️' : 'Removida das Favoritas 💔');
    toastOpacityAnim.setValue(0);
    toastTranslateAnim.setValue(10);

    Animated.parallel([
      Animated.timing(toastOpacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslateAnim, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacityAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateAnim, {
            toValue: -8,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setReactionText(null);
        });
      }, 1200);
    });
  };

  return (
    <Modal
      visible={isPlayerModalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closePlayerModal}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Reaction Toast Notification */}
        {reactionText && (
          <Animated.View
            style={[
              styles.reactionToast,
              {
                opacity: toastOpacityAnim,
                transform: [{ translateY: toastTranslateAnim }],
              },
            ]}
          >
            <Heart size={16} color={theme.colors.accentPink} fill={theme.colors.accentPink} />
            <Text style={styles.reactionToastText}>{reactionText}</Text>
          </Animated.View>
        )}

        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={closePlayerModal} style={styles.headerButton}>
            <ChevronDown size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <View style={styles.headerTitleRow}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerMain} numberOfLines={1}>
                UpperMusic Player
              </Text>
            </View>
            <Text style={styles.headerSub}>TOCANDO DA PRATELEIRA</Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={handleFavoriteClick}
          >
            <Animated.View style={{ transform: [{ scale: heartScaleAnim }] }}>
              <Heart
                size={26}
                color={currentSong.isFavorite ? theme.colors.accentPink : theme.colors.textMuted}
                fill={currentSong.isFavorite ? theme.colors.accentPink : 'transparent'}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Large Album Artwork */}
        <View style={styles.artworkContainer}>
          <View style={styles.artworkShadow}>
            <Image
              source={
                currentSong.thumbnail
                  ? { uri: currentSong.thumbnail }
                  : require('../assets/logo.png')
              }
              style={styles.artwork}
            />
          </View>
        </View>

        {/* Track Info (Offline badge removed as requested) */}
        <View style={styles.infoContainer}>
          <View style={styles.titleWrapper}>
            <Text style={styles.title} numberOfLines={2}>
              {currentSong.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
        </View>

        {/* Interactive Scrubber / Progress Bar */}
        <View style={styles.scrubberSection}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleProgressBarPress}
            style={styles.scrubberTouchable}
          >
            <View style={styles.scrubberTrack}>
              <View style={[styles.scrubberFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.scrubberThumb, { left: `${progress * 100}%` }]} />
            </View>
          </TouchableOpacity>

          <View style={styles.timeLabels}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>-{formatTime(Math.max(duration - position, 0))}</Text>
          </View>
        </View>

        {/* Player Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={toggleShuffle} style={styles.controlSmall}>
            <Shuffle
              size={22}
              color={isShuffle ? theme.colors.accent : theme.colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={previousSong} style={styles.controlMedium}>
            <SkipBack
              size={30}
              color={theme.colors.textPrimary}
              fill={theme.colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={styles.playBigButton}>
            {isPlaying ? (
              <Pause size={34} color="#fff" />
            ) : (
              <Play size={34} color="#fff" fill="#fff" style={styles.playIconOffset} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={nextSong} style={styles.controlMedium}>
            <SkipForward
              size={30}
              color={theme.colors.textPrimary}
              fill={theme.colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleRepeat} style={styles.controlSmall}>
            {repeatMode === 'one' ? (
              <Repeat1 size={22} color={theme.colors.accent} />
            ) : (
              <Repeat
                size={22}
                color={repeatMode === 'all' ? theme.colors.accent : theme.colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgDark,
      paddingHorizontal: 24,
      justifyContent: 'space-between',
      paddingBottom: 24,
    },
    reactionToast: {
      position: 'absolute',
      top: 64,
      alignSelf: 'center',
      zIndex: 100,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.bgCard,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.full,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.accentPink,
      shadowColor: theme.colors.accentPink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 12,
    },
    reactionToastText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    headerButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitles: {
      alignItems: 'center',
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerLogo: {
      width: 18,
      height: 18,
      borderRadius: 4,
    },
    headerSub: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginTop: 2,
    },
    headerMain: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    artworkContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 16,
    },
    artworkShadow: {
      width: ALBUM_SIZE,
      height: ALBUM_SIZE,
      borderRadius: theme.borderRadius.xl,
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: theme.isDark ? 0.45 : 0.25,
      shadowRadius: 28,
      elevation: 20,
      backgroundColor: theme.colors.bgCard,
    },
    artwork: {
      width: '100%',
      height: '100%',
      borderRadius: theme.borderRadius.xl,
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginVertical: 8,
    },
    titleWrapper: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 28,
      marginBottom: 6,
    },
    artist: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '500',
    },
    scrubberSection: {
      marginVertical: 8,
    },
    scrubberTouchable: {
      height: 30,
      justifyContent: 'center',
    },
    scrubberTrack: {
      height: 5,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 3,
      position: 'relative',
    },
    scrubberFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: 3,
    },
    scrubberThumb: {
      position: 'absolute',
      top: -5,
      width: 15,
      height: 15,
      borderRadius: 8,
      backgroundColor: theme.colors.accent,
      borderWidth: 2,
      borderColor: '#fff',
      marginLeft: -7,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
    },
    timeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    timeText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    controlsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      marginVertical: 12,
    },
    controlSmall: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlMedium: {
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playBigButton: {
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 10,
    },
    playIconOffset: {
      marginLeft: 4,
    },
  });
