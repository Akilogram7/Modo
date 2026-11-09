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
import CreateModeScreen, { CHARACTERS } from './src/screens/createModeScreen';
import PresetModeScreen, { type PresetKey } from './src/screens/presetModes';
import AchievementsScreen from './src/screens/achievementsScreen';
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { AuthGate } from './src/components/AuthGate';

const IMAGES = [
  require('./assets/HomePage/ModoStudy.png'),
  require('./assets/HomePage/ModoSleep.png'),
  require('./assets/HomePage/ModoRun.png'),
  require('./assets/HomePage/ModoSunglasses.png'),
  require('./assets/HomePage/ClassicModo 1.png'),
  require('./assets/HomePage/Cloud Background.png'),
  require('./assets/HomePage/Plus.png'),
  // used on the preset mode pages
  require('./assets/createMode/ModoStudy.png'),
  require('./assets/createMode/ModoSleep.png'),
  require('./assets/createMode/ModoRun.png'),
];

// AuthProvider wraps everything so any screen can use useAuth()
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isLoading: authLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    DynaPuff_400Regular,
    Nunito_400Regular,
    Nunito_700Bold,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
  });

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [charsReady, setCharsReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');
  const [screen, setScreen] = useState<'home' | 'mode' | 'createMode' | 'achievements'>('home');
  const [preset, setPreset] = useState<PresetKey>('study'); // which preset page is open
  const [createFrom, setCreateFrom] = useState<'home' | 'mode'>('home'); // where "Go Back" returns to

  useEffect(() => {
    Asset.loadAsync(IMAGES)
      .catch((e) => console.warn('image preload failed', e))
      .finally(() => setImagesLoaded(true));

    const t = setTimeout(() => setMinTimePassed(true), 3000);

    return () => clearTimeout(t);
  }, []);

  // Loading screen while assets load AND while we check if someone's already logged in
  if (!fontsLoaded || !imagesLoaded || !minTimePassed || authLoading) {
    return <LoadingScreen />;
  }

  // opens the create mode page (loads the Modo characters the first time)
  async function openCreateMode(from: 'home' | 'mode') {
    setCreateFrom(from);
    if (!charsReady) {
      setLoadingCreate(true);
      try {
        await Promise.all([
          Asset.loadAsync(CHARACTERS),
          new Promise((r) => setTimeout(r, 1500)), // minimum time so the loading screen doesn't flash
        ]);
      } catch (e) {
        console.warn('character preload failed', e);
      }
      setCharsReady(true);
      setLoadingCreate(false);
    }
    setScreen('createMode');
  }

  if (loadingCreate) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      {/* Logged out: shows sign in / sign up. Logged in: shows everything inside. */}
      <AuthGate>
        <View style={{ flex: 1 }}>
          {screen === 'home' && (
            <>
              <HomeScreen
                onModePress={(mode) => {
                  setPreset(mode); // 'study' | 'sleep' | 'commute'
                  setScreen('mode');
                }}
                onCreateMode={() => openCreateMode('home')}
                onAchievements={() => setScreen('achievements')}
              />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
                <TabBar active={tab} onChange={setTab} />
              </View>
            </>
          )}

          {screen === 'mode' && (
            <PresetModeScreen
              mode={preset}
              onChangeSettings={() => openCreateMode('mode')}
              onEnd={() => setScreen('home')}
            />
          )}

          {screen === 'createMode' && (
            <CreateModeScreen
              onBack={() => setScreen(createFrom)}
              onCreate={(mode) => {
                console.log('new mode:', mode);
                setScreen('home');
              }}
            />
          )}

          {screen === 'achievements' && <AchievementsScreen onBack={() => setScreen('home')} />}
        </View>
      </AuthGate>
    </SafeAreaProvider>
  );
}