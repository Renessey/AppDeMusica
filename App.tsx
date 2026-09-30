import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MusicProvider } from './src/context/MusicContext';
import { AppNavigator } from './src/components/AppNavigator';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar hidden={true} />
      <MusicProvider>
        <AppNavigator />
      </MusicProvider>
    </SafeAreaProvider>
  );
}

export default App;
