import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Music2, ListMusic, Globe, Download } from 'lucide-react-native';
import { MainShelfScreen } from '../screens/MainShelfScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { YouTubeBrowserScreen } from '../screens/YouTubeBrowserScreen';
import { DownloadsScreen } from '../screens/DownloadsScreen';
import { MiniPlayer } from './MiniPlayer';
import { FullScreenPlayer } from './FullScreenPlayer';
import { useMusic } from '../context/MusicContext';
import { theme } from '../theme';

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

export const AppNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [initialYouTubeUrl, setInitialYouTubeUrl] = useState<string | null>(null);
  const { activeDownloads } = useMusic();

  const activeDownloadCount = Object.keys(activeDownloads).length;

  const handleNavigateToYouTube = (url: string) => {
    setInitialYouTubeUrl(url);
    setActiveTab(2);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 0:
        return <MainShelfScreen onNavigateToTab={(tab) => setActiveTab(tab)} />;
      case 1:
        return <PlaylistsScreen />;
      case 2:
        return <YouTubeBrowserScreen initialUrl={initialYouTubeUrl} />;
      case 3:
        return <DownloadsScreen onNavigateToYouTube={handleNavigateToYouTube} />;
      default:
        return <MainShelfScreen onNavigateToTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Screen View */}
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Docked Mini Player */}
      <MiniPlayer />

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDownloadTab = tab.id === 3;
          const Icon = tab.IconComponent;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab.id)}
            >
              <View style={styles.tabIconWrapper}>
                <Icon
                  size={22}
                  color={isActive ? theme.colors.accentLight : theme.colors.textMuted}
                />
                {isDownloadTab && activeDownloadCount > 0 && (
                  <View style={styles.downloadBadge}>
                    <Text style={styles.downloadBadgeText}>{activeDownloadCount}</Text>
                  </View>
                )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
  },
  screenContainer: {
    flex: 1,
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
    elevation: 8,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
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
  downloadBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: theme.colors.accentCyan,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
});
