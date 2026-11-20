import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import {
  STRENGTHS,
  TINT_COLOR,
  isFilterOn,
  nextChange,
  toBlueLightSettings,
  type BlueLightSettings,
} from './blueLight';

// Holds the blue light filter settings for whoever is logged in, saves them to their
// account, and knows whether the warm tint should be showing right now.

type ContextValue = {
  settings: BlueLightSettings;
  update: (changes: Partial<BlueLightSettings>) => void;
  active: boolean; // the tint is on right now
};

const BlueLightContext = createContext<ContextValue | undefined>(undefined);

const SAVE_DELAY_MS = 1500;

export function BlueLightProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // What's saved on their account (as text, so it only changes when the settings really change)
  const savedJson = JSON.stringify(toBlueLightSettings(user?.user_metadata?.blue_light_filter));
  const saved = useMemo(() => JSON.parse(savedJson) as BlueLightSettings, [savedJson]);

  // Changes show up straight away, then get saved a moment later
  const [edited, setEdited] = useState<{ userId: string | null; settings: BlueLightSettings } | null>(null);
  const settings = edited && edited.userId === userId ? edited.settings : saved;

  const [now, setNow] = useState(() => new Date());

  // Save to the account after they stop changing things
  useEffect(() => {
    if (!userId || JSON.stringify(settings) === savedJson) return;
    const timer = setTimeout(() => {
      void supabase.auth
        .updateUser({ data: { blue_light_filter: settings } })
        .then(({ error }) => {
          if (error) console.warn('Could not save the blue light filter:', error.message);
        });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [userId, settings, savedJson]);

  // Wake up exactly when the tint should turn on or off, and when the app comes back
  useEffect(() => {
    const next = nextChange(settings, new Date());
    const timer = next
      ? setTimeout(() => setNow(new Date()), Math.max(1000, next.getTime() - Date.now() + 1000))
      : null;
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      if (timer) clearTimeout(timer);
      appState.remove();
    };
  }, [settings, now]);

  const value = useMemo<ContextValue>(
    () => ({
      settings,
      update: (changes) => {
        setNow(new Date());
        setEdited({ userId, settings: { ...settings, ...changes } });
      },
      active: isFilterOn(settings, now),
    }),
    [settings, now, userId],
  );

  return <BlueLightContext.Provider value={value}>{children}</BlueLightContext.Provider>;
}

export function useBlueLight() {
  const context = useContext(BlueLightContext);
  if (!context) {
    throw new Error('useBlueLight has to be used inside <BlueLightProvider>');
  }
  return context;
}

// The warm see-through layer over the whole app. Touches go straight through it.
export function BlueLightOverlay() {
  const { active, settings } = useBlueLight();
  if (!active) return null;
  const opacity = STRENGTHS.find((s) => s.key === settings.strength)?.opacity ?? 0.2;
  return (
    <View
      pointerEvents="none"
      testID="blue-light-overlay"
      style={[StyleSheet.absoluteFill, styles.tint, { opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  tint: {
    backgroundColor: TINT_COLOR,
    zIndex: 2000,
    elevation: 2000,
  },
});
