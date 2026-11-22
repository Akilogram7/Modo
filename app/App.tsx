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
import { AchievementsProvider, useAchievements } from './src/achievements/AchievementsProvider';
import AchievementToast from './src/achievements/AchievementToast';
import { BlueLightOverlay, BlueLightProvider } from './src/features/bluelight';
import { dndOffForMode } from './src/features/dnd';
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { AuthGate } from './src/components/AuthGate';
import { endModeSession, fetchLastUsed, startModeSession } from './src/stats/modeSessions';
import CustomModeScreen from './src/screens/customModeScreen';
import ModesScreen, { presetStarter } from './src/screens/modesScreen';
import type { CustomMode, CustomModeInput } from './src/types/mode';
import { loadPresetConfig, savePresetConfig } from './src/services/presetSettings';
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
  setGroupTimer,
  shareMode,
  stopSharingMode,
  toModeGroups,
  type JoinedMode,
  type ModeGroups,
} from './src/services/modeGroups';

// How often we check if a friend started a shared mode (only while you've joined one)
const GROUP_CHECK_MS = 8000;
// How often we check while you're inside a friend's mode, to keep up with their timer
const FOLLOWING_CHECK_MS = 3000;

const IMAGES = [
  require('./assets/Modos/ModoStudy.png'),
  require('./assets/Modos/ModoSleep.png'),
  require('./assets/Modos/ModoRun.png'),
  require('./assets/Modos/ModoSunglasses.png'),
  require('./assets/Modos/ModoWave.png'),
];
// True when nothing was changed on the Create / Edit Mode screen
function sameSettings(before: CustomModeInput, after: CustomModeInput) {
  return (Object.keys(after) as (keyof CustomModeInput)[]).every(
    (key) => JSON.stringify(before[key]) === JSON.stringify(after[key]),
  );
}
// AuthProvider wraps everything so any screen can use useAuth()
export default function App() {
  return (
    <AuthProvider>
      <AchievementsProvider>
        <BlueLightProvider>
          <AppContent />
        </BlueLightProvider>
      </AchievementsProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { isLoading: authLoading, session } = useAuth();
  const { record: recordAchievement } = useAchievements();

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
  const [createFrom, setCreateFrom] = useState<'home' | 'mode' | 'customMode' | 'modes'>('home');
  // The mode being edited on the create mode screen (null = making a new one)
  const [editingMode, setEditingMode] = useState<CustomMode | null>(null);
  // Initial settings for the editor when editing a preset
  const [prefillMode, setPrefillMode] = useState<CustomModeInput | null>(null);
  // Presets keep their stable study/sleep/commute IDs, separate from custom modes.
  const [presetConfigs, setPresetConfigs] = useState<Partial<Record<PresetKey, CustomModeInput>>>({});
  const [editingPreset, setEditingPreset] = useState<PresetKey | null>(null);

  // Sharing: modes the user shares with friends, and friends' modes they joined
  const [groups, setGroups] = useState<ModeGroups>(NO_GROUPS);
  // The latest sharing info, for popups and timers that were set up on an earlier screen
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const groupsSignatureRef = useRef('');
  const lastHostStartsRef = useRef<Record<string, number>>({});
  // The friend's shared mode you're inside right now (null = you're not in one).
  // Only the host controls it, so you just follow along.
  const [following, setFollowing] = useState<{
    groupId: string;
    hostName: string;
    modeName: string;
  } | null>(null);
  const followingRef = useRef(following);
  followingRef.current = following;

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
    setFollowing(null);
    setLastUsed({});
    setPresetConfigs({});
    setEditingPreset(null);

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

    // Preset configurations belong to the signed-in user, just like custom modes.
    Promise.all(
      (['study', 'sleep', 'commute'] as PresetKey[]).map(async (id) => ({
        id,
        config: await loadPresetConfig(id),
      })),
    )
      .then((items) => {
        if (cancelled) return;
        const saved: Partial<Record<PresetKey, CustomModeInput>> = {};
        for (const { id, config } of items) {
          if (config) saved[id] = config;
        }
        setPresetConfigs(saved);
      })
      .catch((error) => console.warn('Could not load preset configurations:', error));

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
  const followingGroupId = following?.groupId ?? null;
  useEffect(() => {
    if (!session?.user.id || !hasJoinedModes) return;

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadGroups().catch(() => {});
      }
    }, followingGroupId ? FOLLOWING_CHECK_MS : GROUP_CHECK_MS);

    return () => clearInterval(timer);
  }, [session?.user.id, hasJoinedModes, followingGroupId]);

  // Loads everything about sharing, and asks to join if a friend just started a mode.
  // quiet = don't show the "want to join?" popup (used when you're already joining).
  // Gives back the latest sharing info, or null if the user changed while loading.
  async function loadGroups({ quiet = false }: { quiet?: boolean } = {}): Promise<ModeGroups | null> {
    const userId = userIdRef.current;
    const rows = await fetchGroupRows();
    if (userIdRef.current !== userId) return null; // logged out or switched account while loading

    const latest = toModeGroups(rows);

    // Only update the screen when something actually changed
    const signature = groupsSignature(rows);
    if (signature !== groupsSignatureRef.current) {
      groupsSignatureRef.current = signature;
      setGroups(latest);
    }

    // If you're in a friend's mode and they end it (or stop sharing it), it ends for you too
    const followed = followingRef.current;
    if (followed) {
      const joined = latest.joined.find((j) => j.groupId === followed.groupId);
      if (!joined || joined.runningForSeconds === null) {
        followingRef.current = null; // so a second check right after doesn't end it twice
        void endModeSession();
        setFollowing(null);
        setActiveCustomMode(null);
        setTab('home');
        setScreen('home');
        Alert.alert(
          `${followed.hostName} ended ${followed.modeName}`,
          joined
            ? "You'll get a popup to join the next time they start it."
            : 'They stopped sharing this mode.',
        );
      }
    }

    const justStarted = findNewHostStarts(rows, lastHostStartsRef.current);
    if (justStarted.length === 0 || quiet) return latest;

    const joinedModes = latest.joined;
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

    return latest;
  }

  // Opens a friend's mode while they have it on (after tapping Join, or tapping the mode)
  function joinRunningMode(joined: JoinedMode) {
    tellFriendsModeEnded(); // your own shared mode can't still be on while you're in theirs
    const next = {
      groupId: joined.groupId,
      hostName: joined.hostName,
      modeName: joined.mode.name.trim() || 'their mode',
    };
    followingRef.current = next;
    setFollowing(next);
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

  // If the user shares any modes, friends need to know when one ends.
  // (Reads groupsRef because the "join" popup can call this from an older screen.)
  function tellFriendsModeEnded() {
    const sharesAnyMode = Object.keys(groupsRef.current.hosted).length > 0;
    if (sharesAnyMode) void setGroupModeRunning(null, false);
  }

  // Starting a mode works the same from the home screen and the modes screen
  function startPresetMode(mode: PresetKey) {
    setFollowing(null);
    startModeSession(mode);
    markUsed(mode);
    tellFriendsModeEnded(); // a shared mode can't still be running if you switched to this one
    setPreset(mode);
    setScreen('mode');
  }

  function startCustomMode(mode: CustomMode) {
    setFollowing(null);
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

  // Tapping a custom mode on the home or modes screen.
  // Your own modes start right away. A friend's shared mode works like a lobby:
  // only they can start it, and you can hop in while it's on.
  async function pressCustomMode(mode: CustomMode) {
    const cached = groups.joined.find((j) => j.mode.id === mode.id);
    if (!cached) {
      startCustomMode(mode);
      return;
    }

    // Check the latest first, in case they just started or ended it
    let joined: JoinedMode | undefined = cached;
    try {
      const latest = await loadGroups({ quiet: true });
      if (latest) joined = latest.joined.find((j) => j.groupId === cached.groupId);
    } catch (error) {
      console.warn('Could not check the shared mode:', error);
    }

    if (!joined) {
      Alert.alert('Mode no longer shared', `${cached.hostName} stopped sharing this mode.`);
      return;
    }

    if (joined.runningForSeconds !== null) {
      joinRunningMode(joined);
      return;
    }

    const name = joined.mode.name.trim() || 'this mode';
    Alert.alert(
      `Waiting for ${joined.hostName}`,
      `Only ${joined.hostName} can start ${name}. You'll get a popup when they do, or tap it again while it's on to join.`,
    );
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
  // Pass `prefill` to initialize the editor; editingPreset selects preset persistence.
  async function openCreateMode(
    from: 'home' | 'mode' | 'customMode' | 'modes',
    editing: CustomMode | null = null,
    prefill: CustomModeInput | null = null,
  ) {
    setCreateFrom(from);
    setEditingMode(editing);
    setPrefillMode(prefill);
    setEditingPreset(null);

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

  // Editing a built-in preset must never create a row in the custom 'modes' table.
  async function openPresetEditor(id: PresetKey, from: 'mode' | 'modes') {
    const initial = presetConfigs[id] ?? presetStarter(id);
    await openCreateMode(from, null, initial);
    setEditingPreset(id);
  }

  if (loadingCreate) {
    return <LoadingScreen />;
  }

  // The user's own modes plus friends' modes they joined (for the home and stats screens)
  const allCustomModes = [...customModes, ...groups.joined.map((joined) => joined.mode)];

  // Inside a friend's mode: their latest settings and timer
  const followedMode = following
    ? groups.joined.find((j) => j.groupId === following.groupId)
    : undefined;
  // Inside your own shared mode: friends need to hear about your timer
  const hostingActiveMode = !following && !!activeCustomMode && !!groups.hosted[activeCustomMode.id];

  return (
    <SafeAreaProvider>
      {/* Logged out: shows sign in / sign up. Logged in: shows everything inside. */}
      <AuthGate>
        <View style={{ flex: 1 }}>
          {screen === 'home' && (
            <HomeScreen
              customModes={allCustomModes}
              presetConfigs={presetConfigs}
              lastUsed={lastUsed}
              onSeeAllModes={() => goToTab('modes')}
              onCustomModePress={pressCustomMode}
              onModePress={startPresetMode}
              onCreateMode={() => openCreateMode('home')}
              onAchievements={() => setScreen('achievements')}
            />
          )}

          {screen === 'mode' && (
            <PresetModeScreen
              mode={preset}
              config={presetConfigs[preset]}
              // Open the editor for the existing preset ID.
              onChangeSettings={(current) =>
                openPresetEditor(preset, 'mode')
              }
              onEnd={() => {
                tellFriendsModeEnded();
                setTab('home');
                setScreen('home');
              }}
            />
          )}

          {screen === 'customMode' && activeCustomMode && (
            <CustomModeScreen
              mode={followedMode?.mode ?? activeCustomMode}
              // Edit this mode, then come back to it (friends following someone else's mode can't)
              onChangeSettings={following ? undefined : () => openCreateMode('customMode', activeCustomMode)}
              hostName={following?.hostName}
              sharedTimer={followedMode?.timer ?? null}
              onTimerChange={
                hostingActiveMode
                  ? (timer) => void setGroupTimer(activeCustomMode.id, timer)
                  : undefined
              }
              onEnd={() => {
                // Friends just leave. Hosts end it for everyone.
                if (!following) tellFriendsModeEnded();
                setFollowing(null);
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
              presetConfigs={presetConfigs}
              onPresetPress={startPresetMode}
              onEditPreset={(id) => void openPresetEditor(id, 'modes')}
              onCustomModePress={pressCustomMode}
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

                // Nothing changed: just go back instead of saving (or copying a preset)
                const before = editingMode ?? prefillMode;
                if (before && sameSettings(before, mode)) {
                  setScreen(createFrom);
                  return;
                }
                setSavingMode(true);

                try {
                  if (editingPreset) {
                    await savePresetConfig(editingPreset, mode);
                    setPresetConfigs((prev) => ({ ...prev, [editingPreset]: mode }));
                    recordAchievement('presetsEdited');
                    setScreen(createFrom);
                    return;
                  } else if (editingMode) {
                    // Editing: save the changes over the existing mode
                    const updatedMode = await updateCustomMode(editingMode.id, mode);
                    recordAchievement('modesEdited');

                    setCustomModes((prev) =>
                      prev.map((m) => (m.id === updatedMode.id ? updatedMode : m)),
                    );

                    // Edited from inside the running mode: go back to it with the new settings
                    if (createFrom === 'customMode') {
                      setActiveCustomMode(updatedMode);
                      setScreen('customMode');
                      return;
                    }
                  } else {
                    const newMode = await createCustomMode(mode);
                    recordAchievement('modesCreated');

                    setCustomModes((prev) => [...prev, newMode]);
                  }

                  // Saving a running preset's settings leaves that mode, so turn its Do Not Disturb off
                  if (createFrom === 'mode') void dndOffForMode();

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

          {/* Pops up over every screen when an achievement unlocks.
              Tapping it opens the profile, but not in the middle of a mode (that would leave the mode). */}
          <AchievementToast
            onOpen={
              screen === 'mode' || screen === 'customMode' ? undefined : () => goToTab('profile')
            }
          />

          {/* Warm tint over everything while the blue light filter is on */}
          <BlueLightOverlay />
        </View>
      </AuthGate>
    </SafeAreaProvider>
  );
}
