import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music2, ListMusic, Globe, Download } from 'lucide-react-native';
import { MainShelfScreen } from '../screens/MainShelfScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { YouTubeBrowserScreen } from '../screens/YouTubeBrowserScreen';
import { DownloadsScreen } from '../screens/DownloadsScreen';
import { MiniPlayer } from './MiniPlayer';
import { FullScreenPlayer } from './FullScreenPlayer';
import { useMusic } from '../context/MusicContext';
import { useTheme, AppTheme } from '../theme';

interface TabItem {
  id: number;
  label: string;
  IconComponent: any;
}

const TABS: TabItem[] = [
  { id: 0, label: 'Prateleira', IconComponent: Music2 },
  { id: 1, label: 'Playlists', IconComponent: ListMusic },
  { id: 2, label: 'YouTube', IconComponent: Globe },
  { id: 3, label: 'Baixar', IconComponent: Download },
];

// Isolated badge so AppNavigator does not re-render on active download progress ticks
const DownloadBadge: React.FC = React.memo(() => {
  const { activeDownloads } = useMusic();
  const count = Object.keys(activeDownloads).length;
  if (count === 0) return null;

  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.badgeText}>{count}</Text>
    </View>
  );
});

export const AppNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [initialYouTubeUrl, setInitialYouTubeUrl] = useState<string | null>(null);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Garante que o topo do app fique sempre abaixo da barra de status / notificações
  const topPadding = Math.max(insets.top, StatusBar.currentHeight || 0);
  const bottomPadding = Math.max(insets.bottom, 6);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleNavigateToTab = useCallback((tab: number) => {
    setActiveTab(tab);
  }, []);

  const handleNavigateToYouTube = useCallback((url: string) => {
    setInitialYouTubeUrl(url);
    setActiveTab(2);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>

      {/* Screen Container:
          - Screens 0, 1 and 3 use display: flex / none to eliminate layout/compositing lag on Android.
          - Screen 2 (YouTube) uses opacity / zIndex to guarantee WebView session/video is NEVER reloaded or lost. */}
      <View style={styles.screenContainer}>
        {/* Tab 0: Prateleira */}
        <View
          style={[
            styles.screenPane,
            { display: activeTab === 0 ? 'flex' : 'none' },
          ]}
        >
          <MainShelfScreen onNavigateToTab={handleNavigateToTab} />
        </View>

        {/* Tab 1: Playlists */}
        <View
          style={[
            styles.screenPane,
            { display: activeTab === 1 ? 'flex' : 'none' },
          ]}
        >
          <PlaylistsScreen />
        </View>

        {/* Tab 2: YouTube Browser (Kept mounted & alive in background) */}
        <View
          style={[
            styles.screenPane,
            activeTab === 2
              ? styles.youtubeVisible
              : styles.youtubeHidden,
          ]}
          pointerEvents={activeTab === 2 ? 'auto' : 'none'}
        >
          <YouTubeBrowserScreen initialUrl={initialYouTubeUrl} />
        </View>

        {/* Tab 3: Baixar */}
        <View
          style={[
            styles.screenPane,
            { display: activeTab === 3 ? 'flex' : 'none' },
          ]}
        >
          <DownloadsScreen onNavigateToYouTube={handleNavigateToYouTube} />
        </View>
      </View>

      {/* Docked Mini Player */}
      <MiniPlayer />

      {/* Bottom Navigation Bar */}
      <View style={[styles.tabBar, { paddingBottom: 10 + bottomPadding }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDownloadTab = tab.id === 3;
          const Icon = tab.IconComponent;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              activeOpacity={0.6}
              delayPressIn={0}
              onPress={() => setActiveTab(tab.id)}
            >
              <View style={styles.tabIconWrapper}>
                <Icon
                  size={22}
                  color={isActive ? theme.colors.accentLight : theme.colors.textMuted}
                />
                {isDownloadTab && <DownloadBadge />}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Full-screen audio player */}
      <FullScreenPlayer />
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#06b6d4',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgDark,
    },
    screenContainer: {
      flex: 1,
      position: 'relative',
    },
    screenPane: {
      ...StyleSheet.absoluteFill,
    },
    youtubeVisible: {
      opacity: 1,
      zIndex: 10,
    },
    youtubeHidden: {
      opacity: 0,
      zIndex: -1,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.bgCard,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: 10,
      paddingHorizontal: 8,
      justifyContent: 'space-around',
      alignItems: 'center',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    tabButton: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: 2,
    },
    tabIconWrapper: {
      position: 'relative',
      height: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    tabLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    tabLabelActive: {
      color: theme.colors.accentLight,
      fontWeight: '800',
    },
  });
