import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';

import { DynaPuff_400Regular, DynaPuff_500Medium } from '@expo-google-fonts/dynapuff';
import { Baloo2_600SemiBold, Baloo2_700Bold} from '@expo-google-fonts/baloo-2';

import LoadingScreen from './src/screens/loadingScreen';
import HomeScreen from './src/screens/homeScreen';
import TabBar, { TabKey } from './src/components/TabBar';
import CreateModeScreen, { CHARACTERS } from './src/screens/createModeScreen';
import ProfileScreen from './src/screens/profileScreen';
import StatsScreen from './src/screens/statsScreen';
import PresetModeScreen, { type PresetKey } from './src/screens/presetModes';
import AchievementsScreen from './src/achievements/achievementsScreen';
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { AuthGate } from './src/components/AuthGate';
import { fetchLastUsed, startModeSession } from './src/stats/modeSessions';
import CustomModeScreen from './src/screens/customModeScreen';
import ModesScreen from './src/screens/modesScreen';
import type { CustomMode, CustomModeInput } from './src/types/mode';
import {
  createCustomMode,
  deleteCustomMode,
  fetchCustomModes,
  saveCustomModeOrder,
  updateCustomMode,
} from './src/services/customModes';
import {
  NO_GROUPS,
  fetchGroupRows,
  findNewHostStarts,
  groupsSignature,
  joinModeGroup,
  leaveModeGroup,
  setGroupModeRunning,
  shareMode,
  stopSharingMode,
  toModeGroups,
  type JoinedMode,
  type ModeGroups,
} from './src/services/modeGroups';

// How often we check if a friend started a shared mode (only while you've joined one)
const GROUP_CHECK_MS = 8000;

const IMAGES = [
  require('./assets/Modos/ModoStudy.png'),
  require('./assets/Modos/ModoSleep.png'),
  require('./assets/Modos/ModoRun.png'),
  require('./assets/Modos/ModoSunglasses.png'),
  require('./assets/Modos/ModoWave.png'),
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
    DynaPuff_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
  });

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [charsReady, setCharsReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');
  const [screen, setScreen] = useState<
    'home' | 'mode' | 'customMode' | 'createMode' | 'achievements' | 'profile' | 'stats' | 'modes'
  >('home');

  const [preset, setPreset] = useState<PresetKey>('study');
  const [createFrom, setCreateFrom] = useState<'home' | 'mode' | 'modes'>('home');
  // The mode being edited on the create mode screen (null = making a new one)
  const [editingMode, setEditingMode] = useState<CustomMode | null>(null);
  // Settings to start a NEW mode with (used when you edit a preset from the modes screen)
  const [prefillMode, setPrefillMode] = useState<CustomModeInput | null>(null);

  // Sharing: modes the user shares with friends, and friends' modes they joined
  const [groups, setGroups] = useState<ModeGroups>(NO_GROUPS);
  const groupsSignatureRef = useRef('');
  const lastHostStartsRef = useRef<Record<string, number>>({});

  // When each mode was last started, so the home screen can show the most recent ones
  const [lastUsed, setLastUsed] = useState<Record<string, number>>({});
  const [customModes, setCustomModes] = useState<CustomMode[]>([]);
  const [activeCustomMode, setActiveCustomMode] = useState<CustomMode | null>(null);
  const [modesLoading, setModesLoading] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  // Who is logged in right now (so a slow reply from the last account gets ignored)
  const userIdRef = useRef<string | undefined>(undefined);
  userIdRef.current = session?.user.id;

  // The custom mode that's on screen right now (so we don't ask to join a mode you're already in)
  const activeModeIdRef = useRef<string | null>(null);
  activeModeIdRef.current = screen === 'customMode' ? (activeCustomMode?.id ?? null) : null;

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
    let cancelled = false;

    // Start fresh so nothing from the last account is left over
    setGroups(NO_GROUPS);
    groupsSignatureRef.current = '';
    lastHostStartsRef.current = {};
    setLastUsed({});

    if (!session?.user.id) {
      setTab('home');
      setScreen('home');
      setCustomModes([]);
      setActiveCustomMode(null);
      setModesLoading(false);

      return;
    }

    setCustomModes([]);
    setActiveCustomMode(null);
    setModesLoading(true);

    // These two load in the background. The app still works if they fail.
    loadGroups().catch((error) => console.warn('Could not load shared modes:', error));
    fetchLastUsed()
      .then((times) => {
        if (!cancelled) setLastUsed((prev) => ({ ...times, ...prev }));
      })
      .catch((error) => console.warn('Could not load recently used modes:', error));

    fetchCustomModes()
      .then((modes) => {
        if (!cancelled) {
          setCustomModes(modes);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load custom modes:', error);
          Alert.alert(
            'Unable to load modes',
            'Please check your connection and try signing in again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  // While you've joined a friend's mode, keep checking if they started it
  // (this also picks up any changes they made to its settings)
  const hasJoinedModes = groups.joined.length > 0;
  useEffect(() => {
    if (!session?.user.id || !hasJoinedModes) return;

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadGroups().catch(() => {});
      }
    }, GROUP_CHECK_MS);

    return () => clearInterval(timer);
  }, [session?.user.id, hasJoinedModes]);

  // Loads everything about sharing, and asks to join if a friend just started a mode
  async function loadGroups() {
    const userId = userIdRef.current;
    const rows = await fetchGroupRows();
    if (userIdRef.current !== userId) return; // logged out or switched account while loading

    // Only update the screen when something actually changed
    const signature = groupsSignature(rows);
    if (signature !== groupsSignatureRef.current) {
      groupsSignatureRef.current = signature;
      setGroups(toModeGroups(rows));
    }

    const justStarted = findNewHostStarts(rows, lastHostStartsRef.current);
    if (justStarted.length === 0) return;

    const joinedModes = toModeGroups(rows).joined;
    for (const row of justStarted) {
      const joined = joinedModes.find((j) => j.groupId === row.group_id);
      if (!joined || activeModeIdRef.current === joined.mode.id) continue;

      Alert.alert(
        `${joined.hostName} started ${joined.mode.name.trim() || 'a mode'}`,
        'Want to join in?',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Join', onPress: () => joinRunningMode(joined) },
        ],
      );
    }
  }

  // Opens a friend's mode after tapping Join
  function joinRunningMode(joined: JoinedMode) {
    setActiveCustomMode(joined.mode);
    void startModeSession(joined.mode.id);
    markUsed(joined.mode.id);
    setScreen('customMode');
  }

  // Moves a mode to the front of the home screen
  function markUsed(modeId: string) {
    setLastUsed((prev) => ({ ...prev, [modeId]: Date.now() }));
  }

  // Loading screen while assets load AND while we check if someone's already logged in
  if (
    !fontsLoaded ||
    !imagesLoaded ||
    !minTimePassed ||
    authLoading ||
    (session && modesLoading)
  ) {
    return <LoadingScreen />;
  }

  // Tapping a tab highlights it AND switches to that screen
  function goToTab(next: TabKey) {
    setTab(next);
    if (next === 'home') setScreen('home');
    if (next === 'profile') setScreen('profile');
    if (next === 'stats') setScreen('stats');
    if (next === 'modes') {
      setScreen('modes');
      // Refresh who joined your shared modes
      loadGroups().catch(() => {});
    }
  }

  // If the user shares any modes, friends need to know when one starts or ends
  const sharesAnyMode = Object.keys(groups.hosted).length > 0;

  function tellFriendsModeEnded() {
    if (sharesAnyMode) void setGroupModeRunning(null, false);
  }

  // Starting a mode works the same from the home screen and the modes screen
  function startPresetMode(mode: PresetKey) {
    startModeSession(mode);
    markUsed(mode);
    tellFriendsModeEnded(); // a shared mode can't still be running if you switched to this one
    setPreset(mode);
    setScreen('mode');
  }

  function startCustomMode(mode: CustomMode) {
    setActiveCustomMode(mode);
    void startModeSession(mode.id);
    markUsed(mode.id);

    // Only the host starts a shared mode for everyone.
    // (Friends who joined it aren't in groups.hosted, so for them it only starts on their phone.)
    if (groups.hosted[mode.id]) {
      void setGroupModeRunning(mode.id, true);
    } else {
      tellFriendsModeEnded();
    }

    setScreen('customMode');
  }

  // Deletes a mode from Supabase, then takes it off every screen
  async function removeCustomMode(mode: CustomMode) {
    await deleteCustomMode(mode.id);
    setCustomModes((prev) => prev.filter((m) => m.id !== mode.id));
    // Deleting a shared mode also ends the sharing
    if (groups.hosted[mode.id]) loadGroups().catch(() => {});
  }

  // Sharing actions. Each one reloads the sharing info so every screen is up to date.
  async function shareCustomMode(mode: CustomMode) {
    await shareMode(mode.id);
    await loadGroups();
  }

  async function stopSharingCustomMode(mode: CustomMode) {
    await stopSharingMode(mode.id);
    await loadGroups();
  }

  async function joinWithCode(code: string) {
    await joinModeGroup(code);
    await loadGroups();
  }

  async function leaveJoinedMode(joined: JoinedMode) {
    await leaveModeGroup(joined.groupId);
    await loadGroups();
  }

  // Shows the new order right away, and puts the old one back if saving fails
  async function reorderCustomModes(next: CustomMode[]) {
    const previous = customModes;
    setCustomModes(next);

    try {
      await saveCustomModeOrder(next.map((m) => m.id));
    } catch (error) {
      setCustomModes(previous);
      throw error;
    }
  }

  // Pass a mode as `editing` to edit it instead of making a new one.
  // Pass `prefill` to make a NEW mode that starts with those settings (editing a preset).
  async function openCreateMode(
    from: 'home' | 'mode' | 'modes',
    editing: CustomMode | null = null,
    prefill: CustomModeInput | null = null,
  ) {
    setCreateFrom(from);
    setEditingMode(editing);
    setPrefillMode(prefill);

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

  // The user's own modes plus friends' modes they joined (for the home and stats screens)
  const allCustomModes = [...customModes, ...groups.joined.map((joined) => joined.mode)];

  return (
    <SafeAreaProvider>
      {/* Logged out: shows sign in / sign up. Logged in: shows everything inside. */}
      <AuthGate>
        <View style={{ flex: 1 }}>
          {screen === 'home' && (
            <HomeScreen
              customModes={allCustomModes}
              lastUsed={lastUsed}
              onSeeAllModes={() => goToTab('modes')}
              onCustomModePress={startCustomMode}
              onModePress={startPresetMode}
              onCreateMode={() => openCreateMode('home')}
              onAchievements={() => setScreen('achievements')}
            />
          )}

          {screen === 'mode' && (
            <PresetModeScreen
              mode={preset}
              onChangeSettings={() => openCreateMode('mode')}
              onEnd={() => {
                tellFriendsModeEnded();
                setTab('home');
                setScreen('home');
              }}
            />
          )}

          {screen === 'customMode' && activeCustomMode && (
            <CustomModeScreen
              mode={activeCustomMode}
              onEnd={() => {
                tellFriendsModeEnded();
                setActiveCustomMode(null);
                setTab('home');
                setScreen('home');
              }}
            />
          )}

          {screen === 'profile' && (
            <ProfileScreen onBack={() => goToTab('home')} />
          )}

          {screen === 'stats' && <StatsScreen customModes={allCustomModes} />}

          {screen === 'modes' && (
            <ModesScreen
              customModes={customModes}
              onPresetPress={startPresetMode}
              onEditPreset={(starter) => openCreateMode('modes', null, starter)}
              onCustomModePress={startCustomMode}
              onCreateMode={() => openCreateMode('modes')}
              onEditMode={(mode) => openCreateMode('modes', mode)}
              onDeleteMode={removeCustomMode}
              onReorder={reorderCustomModes}
              hostedShares={groups.hosted}
              joinedModes={groups.joined}
              onShareMode={shareCustomMode}
              onStopSharing={stopSharingCustomMode}
              onJoinWithCode={joinWithCode}
              onLeaveMode={leaveJoinedMode}
            />
          )}

          {screen === 'createMode' && (
            <CreateModeScreen
              initialMode={editingMode ?? prefillMode}
              onBack={() => setScreen(createFrom)}
              onCreate={async (mode) => {
                if (savingMode) return;

                setSavingMode(true);

                try {
                  if (editingMode) {
                    // Editing: save the changes over the existing mode
                    const updatedMode = await updateCustomMode(editingMode.id, mode);

                    setCustomModes((prev) =>
                      prev.map((m) => (m.id === updatedMode.id ? updatedMode : m)),
                    );
                  } else {
                    const newMode = await createCustomMode(mode);

                    setCustomModes((prev) => [...prev, newMode]);

                    console.log('Saved custom mode:', newMode);
                  }

                  // Go back to the modes screen if that's where they came from
                  const backTo = createFrom === 'modes' ? 'modes' : 'home';
                  setScreen(backTo);
                  setTab(backTo);
                } catch (error) {
                  console.error('Failed to save custom mode:', error);

                  Alert.alert(
                    'Unable to save mode',
                    'Your mode could not be saved. Please try again.',
                  );
                } finally {
                  setSavingMode(false);
                }
              }}
            />
          )}

          {screen === 'achievements' && (
            <AchievementsScreen onBack={() => setScreen('home')} />
          )}

          {(screen === 'home' ||
            screen === 'profile' ||
            screen === 'stats' ||
            screen === 'modes') && (
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