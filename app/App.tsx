
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';

import { DynaPuff_400Regular } from '@expo-google-fonts/dynapuff';
import {
  Nunito_400Regular,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
} from '@expo-google-fonts/baloo-2';

import LoadingScreen from './src/screens/loadingScreen';
import HomeScreen from './src/screens/homeScreen';
import TabBar, { TabKey } from './src/components/TabBar';

const IMAGES = [
  require('./assets/HomePage/ModoStudy.png'),
  require('./assets/HomePage/ModoSleep.png'),
  require('./assets/HomePage/ModoRun.png'),
  require('./assets/HomePage/ModoSunglasses.png'),
  require('./assets/HomePage/ClassicModo 1.png'),
  require('./assets/HomePage/Cloud Background.png'),
  require('./assets/HomePage/Plus.png'),
];

export default function App() {
  const [fontsLoaded] = useFonts({
    DynaPuff_400Regular,
    Nunito_400Regular,
    Nunito_700Bold,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
  });

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');

  useEffect(() => {
    Asset.loadAsync(IMAGES)
      .catch((e) => console.warn('image preload failed', e))
      .finally(() => setImagesLoaded(true));

    const t = setTimeout(() => setMinTimePassed(true), 3000);

    return () => clearTimeout(t);
  }, []);

  // Loading screen stays until fonts, images and minimum time are ready
  if (!fontsLoaded || !imagesLoaded || !minTimePassed) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <HomeScreen
          onModePress={(mode) => console.log('open mode:', mode)}
          onCreateMode={() => console.log('create mode')}
          onAchievements={() => console.log('achievements')}
          onSettings={() => console.log('open settings')}
        />

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <TabBar active={tab} onChange={setTab} />
        </View>
      </View>
    </SafeAreaProvider>
  );
}
