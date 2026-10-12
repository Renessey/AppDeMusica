import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { MusicProvider } from './src/context/MusicContext';
import { AppNavigator } from './src/components/AppNavigator';

const ThemedStatusBar: React.FC = () => {
  const { isDark } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
    />
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <MusicProvider>
          <AppNavigator />
        </MusicProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
