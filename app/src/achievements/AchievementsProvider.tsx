import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { onSessionChange } from '../stats/modeSessions';
import { backgroundColors } from '../../assets/theme';
import { achievements, RARITY_XP } from './achievementCatalog';
import {
  evaluateAchievements,
  xpFor,
  type AchievementEventName,
  type AchievementEvents,
  type Progress,
  type SessionFact,
} from './achievementRules';
import {
  EMPTY_SAVED,
  countOwnModes,
  fetchAllSessions,
  loadSavedAchievements,
  saveAchievements,
  type SavedAchievements,
} from './achievementStore';

// Keeps track of achievements and XP for whoever is logged in.
// Any screen can use it: const { totalXP, isUnlocked, record } = useAchievements()

// The popup that slides in when something unlocks
export type UnlockToast = {
  key: number;
  emoji: string;
  title: string;
  subtitle: string;
};

type ContextValue = {
  ready: boolean;
  isUnlocked: (id: number) => boolean;
  progress: Record<number, Progress>;
  unlockedCount: number;
  totalXP: number;
  // Call this when someone does something that isn't a mode session (like making a mode)
  record: (event: AchievementEventName) => void;
  toast: UnlockToast | null;
  dismissToast: () => void;
};

const AchievementsContext = createContext<ContextValue | undefined>(undefined);

type Loaded = {
  userId: string;
  unlocked: Record<string, string>;
  progress: Record<number, Progress>;
};

// Profile picture and colour everyone starts with (same as the profile screen)
const DEFAULT_AVATAR = 'wave';
const DEFAULT_AVATAR_COLOR = backgroundColors[0];

export function AchievementsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [toast, setToast] = useState<UnlockToast | null>(null);

  // The latest saved data and sessions, so quick events in a row don't trip over each other
  const userIdRef = useRef<string | null>(null);
  const savedRef = useRef<SavedAchievements>(EMPTY_SAVED);
  const sessionsRef = useRef<SessionFact[] | null>(null);
  const canSaveRef = useRef(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // What the popup is showing right now, so unlocks close together share one popup
  const toastIdsRef = useRef<number[]>([]);

  // Runs one job at a time, in order
  const run = (job: () => Promise<void>) => {
    queueRef.current = queueRef.current
      .then(job)
      .catch((error) => console.warn('Achievements:', error instanceof Error ? error.message : error));
  };

  const persist = async (forUser: string) => {
    if (!canSaveRef.current) return;
    try {
      await saveAchievements(forUser, savedRef.current);
    } catch (error) {
      console.warn('Could not save achievements:', error instanceof Error ? error.message : error);
    }
  };

  const showUnlocked = (newIds: number[]) => {
    if (newIds.length === 0) return;
    const ids = [...toastIdsRef.current, ...newIds];
    toastIdsRef.current = ids;
    const xp = xpFor(ids);
    if (ids.length === 1) {
      const a = achievements.find((item) => item.id === ids[0])!;
      setToast({
        key: Date.now(),
        emoji: a.emoji,
        title: 'Achievement unlocked!',
        subtitle: `${a.name}  ⭐ +${RARITY_XP[a.rarity]} XP`,
      });
    } else {
      setToast({
        key: Date.now(),
        emoji: '🏆',
        title: `${ids.length} achievements unlocked!`,
        subtitle: `⭐ +${xp} XP`,
      });
    }
  };

  // Works out what's unlocked now, saves anything new, and pops up a message
  const evaluate = async (forUser: string, { reloadSessions = false, saveAnyway = false } = {}) => {
    if (reloadSessions || !sessionsRef.current) {
      sessionsRef.current = await fetchAllSessions();
    }
    if (userIdRef.current !== forUser) return; // logged out or switched accounts

    const saved = savedRef.current;
    const result = evaluateAchievements(
      sessionsRef.current,
      saved.events,
      Object.keys(saved.unlocked).map(Number),
    );

    if (result.newlyUnlocked.length > 0) {
      const when = new Date().toISOString();
      const unlocked = { ...saved.unlocked };
      for (const id of result.newlyUnlocked) unlocked[id] = when;
      savedRef.current = { ...saved, unlocked };
    }

    if (result.newlyUnlocked.length > 0 || saveAnyway) await persist(forUser);
    if (userIdRef.current !== forUser) return;

    setLoaded({ userId: forUser, unlocked: savedRef.current.unlocked, progress: result.progress });
    showUnlocked(result.newlyUnlocked);
  };

  // Load everything when someone logs in
  useEffect(() => {
    userIdRef.current = userId;
    savedRef.current = EMPTY_SAVED;
    sessionsRef.current = null;
    canSaveRef.current = false;
    if (!userId) return;
    const meta = user?.user_metadata ?? {};

    run(async () => {
      let saved = EMPTY_SAVED;
      try {
        saved = (await loadSavedAchievements()) ?? EMPTY_SAVED;
        canSaveRef.current = true;
      } catch (error) {
        // Don't save over their real data if loading failed (or achievements.sql wasn't run yet)
        console.warn('Could not load achievements:', error instanceof Error ? error.message : error);
      }
      const modeCount = await countOwnModes(userId).catch(() => 0);
      if (userIdRef.current !== userId) return;

      // Give credit for things done before achievements existed
      const changedAvatar = typeof meta.avatar === 'string' && meta.avatar !== DEFAULT_AVATAR ? 1 : 0;
      const changedColor =
        typeof meta.avatar_color === 'string' && meta.avatar_color !== DEFAULT_AVATAR_COLOR ? 1 : 0;
      const events: AchievementEvents = {
        ...saved.events,
        modesCreated: Math.max(saved.events.modesCreated ?? 0, modeCount),
        avatarChanged: Math.max(saved.events.avatarChanged ?? 0, changedAvatar),
        colorChanged: Math.max(saved.events.colorChanged ?? 0, changedColor),
      };
      const eventsChanged = JSON.stringify(events) !== JSON.stringify(saved.events);
      savedRef.current = { ...saved, events };

      await evaluate(userId, { reloadSessions: true, saveAnyway: eventsChanged });
    });

    // Check again whenever a mode starts or ends, and when the app comes back
    const stopListening = onSessionChange(() => run(() => evaluate(userId, { reloadSessions: true })));
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') run(() => evaluate(userId, { reloadSessions: true }));
    });

    return () => {
      stopListening();
      appState.remove();
    };
    // Only reload when the account changes (evaluate and run only use refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const record = (event: AchievementEventName) => {
    const forUser = userIdRef.current;
    if (!forUser) return;
    run(async () => {
      const saved = savedRef.current;
      savedRef.current = {
        ...saved,
        events: { ...saved.events, [event]: (saved.events[event] ?? 0) + 1 },
      };
      await evaluate(forUser, { saveAnyway: true });
    });
  };

  // Only show data that belongs to whoever is logged in right now
  const current = loaded && loaded.userId === userId ? loaded : null;

  const value = useMemo<ContextValue>(() => {
    const unlocked = current?.unlocked ?? {};
    const ids = Object.keys(unlocked).map(Number);
    return {
      ready: current !== null,
      isUnlocked: (id) => unlocked[id] !== undefined,
      progress: current?.progress ?? {},
      unlockedCount: ids.length,
      totalXP: xpFor(ids),
      record,
      toast,
      dismissToast: () => {
        toastIdsRef.current = [];
        setToast(null);
      },
    };
    // record only uses refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, toast]);

  return <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>;
}

export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements has to be used inside <AchievementsProvider>');
  }
  return context;
}
