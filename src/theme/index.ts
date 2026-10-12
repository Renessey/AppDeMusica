import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export const darkTheme = {
  isDark: true,
  colors: {
    bgDark: '#080b11',
    bgPrimary: '#0d111a',
    bgSecondary: '#151b27',
    bgCard: '#1a2232',
    bgCardHover: '#232c3f',
    bgGlass: 'rgba(26, 34, 50, 0.92)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.15)',

    // Accents
    accent: '#8b5cf6', // Violet Neon
    accentLight: '#a78bfa',
    accentCyan: '#06b6d4', // Cyan
    accentPink: '#ec4899', // Pink
    accentGradient: ['#8b5cf6', '#ec4899'],
    accentCyanGradient: ['#06b6d4', '#3b82f6'],

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textHighlight: '#38bdf8',

    // Status & Feedback
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',

    // Specific UI Elements
    inputBg: '#0f172a',
    cardItemBg: 'rgba(255, 255, 255, 0.04)',
    activeRowBg: 'rgba(139, 92, 246, 0.15)',
    modalOverlay: 'rgba(0, 0, 0, 0.75)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
};

export const lightTheme = {
  isDark: false,
  colors: {
    bgDark: '#f8fafc',
    bgPrimary: '#ffffff',
    bgSecondary: '#f1f5f9',
    bgCard: '#ffffff',
    bgCardHover: '#f1f5f9',
    bgGlass: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.14)',

    // Accents
    accent: '#7c3aed', // Rich violet
    accentLight: '#8b5cf6',
    accentCyan: '#0891b2', // Rich cyan
    accentPink: '#db2777', // Rich pink
    accentGradient: ['#7c3aed', '#db2777'],
    accentCyanGradient: ['#0891b2', '#2563eb'],

    // Text
    textPrimary: '#0f172a', // Deep slate
    textSecondary: '#475569', // Slate
    textMuted: '#64748b',
    textHighlight: '#0284c7',

    // Status & Feedback
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',

    // Specific UI Elements
    inputBg: '#f1f5f9',
    cardItemBg: 'rgba(0, 0, 0, 0.03)',
    activeRowBg: 'rgba(124, 58, 237, 0.10)',
    modalOverlay: 'rgba(15, 23, 42, 0.65)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
};

export type AppTheme = typeof darkTheme;

// Default static fallback for any static reference
export const theme: AppTheme = darkTheme;

interface ThemeContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = '@UpperMusic:theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  themeMode: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const activeTheme = themeMode === 'light' ? lightTheme : darkTheme;

  return React.createElement(
    ThemeContext.Provider,
    {
      value: {
        theme: activeTheme,
        themeMode,
        isDark: themeMode === 'dark',
        toggleTheme,
        setThemeMode,
      },
    },
    children
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
