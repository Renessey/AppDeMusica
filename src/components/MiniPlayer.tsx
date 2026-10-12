import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { useMusic } from '../context/MusicContext';
import { useTheme, AppTheme } from '../theme';
import { truncateText } from '../utils/formatters';

export const MiniPlayer: React.FC = React.memo(() => {
  const { currentSong, isPlaying, togglePlayPause, nextSong, position, duration, openPlayerModal } = useMusic();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!currentSong) return null;

  const progress = duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={openPlayerModal}
      style={styles.container}
    >
      {/* Progress Bar Top Indicator */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Cover Art */}
        <Image
          source={
            currentSong.thumbnail
              ? { uri: currentSong.thumbnail }
              : require('../assets/logo.png')
          }
          style={styles.thumbnail}
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {truncateText(currentSong.title, 32)}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {truncateText(currentSong.artist, 26)}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isPlaying ? (
              <Pause size={18} color="#fff" />
            ) : (
              <Play size={18} color="#fff" fill="#fff" style={styles.playIconOffset} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={(e) => {
              e.stopPropagation();
              nextSong();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SkipForward size={20} color={theme.colors.textPrimary} fill={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.bgGlass,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: theme.isDark ? 0.35 : 0.1,
      shadowRadius: 10,
      elevation: 8,
    },
    progressBarTrack: {
      height: 3,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 4,
    },
    thumbnail: {
      width: 46,
      height: 46,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.bgCard,
    },
    info: {
      flex: 1,
      marginLeft: theme.spacing.md,
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    artist: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
    },
    playButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    nextButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playIconOffset: {
      marginLeft: 2,
    },
  });
