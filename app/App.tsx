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
import ProfileScreen from './src/screens/profileScreen';
import StatsScreen from './src/screens/statsScreen';
import PresetModeScreen, { type PresetKey } from './src/screens/presetModes';
import AchievementsScreen from './src/screens/achievementsScreen';
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { AuthGate } from './src/components/AuthGate';
import { startModeSession } from './src/stats/modeSessions';
import CustomModeScreen from './src/screens/customModeScreen';
import type { CustomMode } from './src/types/mode';

const IMAGES = [
  require('./assets/HomePage/ModoStudy.png'),
  require('./assets/HomePage/ModoSleep.png'),
  require('./assets/HomePage/ModoRun.png'),
  require('./assets/HomePage/ModoSunglasses.png'),
  require('./assets/HomePage/ClassicModo 1.png'),
  require('./assets/HomePage/Cloud Background.png'),
  require('./assets/HomePage/Plus.png'),
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
  const { isLoading: authLoading, session } = useAuth();

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
  const [screen, setScreen] = useState<
  'home' | 'mode' | 'customMode' | 'createMode' | 'achievements' | 'profile' | 'stats'
>('home');

  const [preset, setPreset] = useState<PresetKey>('study');
  const [createFrom, setCreateFrom] = useState<'home' | 'mode'>('home');
  const [customModes, setCustomModes] = useState<CustomMode[]>([]);
  const [activeCustomMode, setActiveCustomMode] = useState<CustomMode | null>(null);

  useEffect(() => {
    Asset.loadAsync(IMAGES)
      .catch((e) => console.warn('image preload failed', e))
      .finally(() => setImagesLoaded(true));

    const t = setTimeout(() => setMinTimePassed(true), 3000);

    return () => clearTimeout(t);
  }, []);

  // When someone logs out, go back to home so the next person
  // who logs in doesn't land on the old profile screen
  useEffect(() => {
    if (!session) {
      setTab('home');
      setScreen('home');
    }
  }, [session]);

  // Loading screen while assets load AND while we check if someone's already logged in
  if (!fontsLoaded || !imagesLoaded || !minTimePassed || authLoading) {
    return <LoadingScreen />;
  }

  // Tapping a tab highlights it AND switches to that screen
  function goToTab(next: TabKey) {
    setTab(next);
    if (next === 'home') setScreen('home');
    if (next === 'profile') setScreen('profile');
    if (next === 'stats') setScreen('stats');
  }

  async function openCreateMode(from: 'home' | 'mode') {
    setCreateFrom(from);

    if (!charsReady) {
      setLoadingCreate(true);

      try {
        await Promise.all([
          Asset.loadAsync(CHARACTERS),
          new Promise((r) => setTimeout(r, 1500)),
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
            <HomeScreen
              customModes={customModes}
              onCustomModePress={(mode) => {
                setActiveCustomMode(mode);
                void startModeSession(mode.id);
                setScreen('customMode');
              }}
              onModePress={(mode) => {
                startModeSession(mode);
                setPreset(mode);
                setScreen('mode');
              }}
              onCreateMode={() => openCreateMode('home')}
              onAchievements={() => setScreen('achievements')}
            />
          )}

          {screen === 'mode' && (
            <PresetModeScreen
              mode={preset}
              onChangeSettings={() => openCreateMode('mode')}
              onEnd={() => {
                setTab('home');
                setScreen('home');
              }}
            />
          )}

          {screen === 'customMode' && activeCustomMode && (
            <CustomModeScreen
              mode={activeCustomMode}
              onEnd={() => {
                setActiveCustomMode(null);
                setTab('home');
                setScreen('home');
              }}
            />
          )}

          {screen === 'profile' && (
            <ProfileScreen onBack={() => goToTab('home')} />
          )}

          {screen === 'stats' && <StatsScreen />}

          {screen === 'createMode' && (
            <CreateModeScreen
              onBack={() => setScreen(createFrom)}
              onCreate={(mode) => {
                const newMode: CustomMode = {
                  id: `mode-${Date.now()}`,
                  ...mode,
                };

                setCustomModes(prev => [...prev, newMode]);

                console.log('Created custom mode:', newMode);

                setScreen('home');
                setTab('home');
              }}
            />
          )}

          {screen === 'achievements' && (
            <AchievementsScreen onBack={() => setScreen('home')} />
          )}

          {(screen === 'home' || screen === 'profile' || screen === 'stats') && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <TabBar active={tab} onChange={goToTab} />
            </View>
          )}
        </View>
      </AuthGate>
    </SafeAreaProvider>
  );
}