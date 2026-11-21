import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

// Do Not Disturb for modes.
//
// iPhone: Apple doesn't let apps switch Focus / Do Not Disturb themselves. But the Shortcuts app can,
// so each person adds two tiny shortcuts once ("Modo DND On" and "Modo DND Off", each with one
// Set Focus action), and Modo runs them when a mode starts and ends.
//
// Android: switching it needs native code that Expo Go can't run, so Modo opens the
// Do Not Disturb settings for the person to flip themselves.

export const DND_SHORTCUTS = {
  on: {
    name: 'Modo DND On',
    link: 'https://www.icloud.com/shortcuts/e264b379bb2a4dd6ad496002154861ca',
  },
  off: {
    name: 'Modo DND Off',
    link: 'https://www.icloud.com/shortcuts/63576a80b56943d2bb061af277f7b688',
  },
};

export const CAN_RUN_SHORTCUTS = Platform.OS === 'ios';
export const CAN_OPEN_DND_SETTINGS = Platform.OS === 'android';

// ---------- Has this phone added the shortcuts? ----------
// Saved on the phone itself, because that's where the shortcuts live.

const SETUP_KEY = 'modo.dndShortcutsAdded';
let shortcutsAdded: boolean | null = null; // null until loaded
const setupListeners = new Set<(added: boolean) => void>();

async function loadShortcutsAdded(): Promise<boolean> {
  if (shortcutsAdded === null) {
    try {
      shortcutsAdded = (await AsyncStorage.getItem(SETUP_KEY)) === 'yes';
    } catch {
      shortcutsAdded = false;
    }
  }
  return shortcutsAdded;
}

export async function setDndShortcutsAdded(added: boolean): Promise<void> {
  shortcutsAdded = added;
  setupListeners.forEach((listener) => listener(added));
  try {
    await AsyncStorage.setItem(SETUP_KEY, added ? 'yes' : 'no');
  } catch {
    // Not saved, so they'll be asked again next time. Nothing breaks.
  }
}

// For screens: { ready, added, setAdded }
export function useDndSetup() {
  const [added, setAdded] = useState<boolean | null>(shortcutsAdded);

  useEffect(() => {
    let cancelled = false;
    void loadShortcutsAdded().then((value) => {
      if (!cancelled) setAdded(value);
    });
    setupListeners.add(setAdded);
    return () => {
      cancelled = true;
      setupListeners.delete(setAdded);
    };
  }, []);

  return {
    ready: added !== null,
    added: added === true,
    setAdded: (value: boolean) => void setDndShortcutsAdded(value),
  };
}

// ---------- Turning it on and off ----------

// So ending a mode only turns Do Not Disturb off if Modo was the one that turned it on
let modoTurnedItOn = false;

// Runs a shortcut, then comes straight back to Modo
async function runShortcut(name: string): Promise<boolean> {
  const back = encodeURIComponent(ExpoLinking.createURL('/'));
  const url =
    `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(name)}` +
    `&x-success=${back}&x-cancel=${back}&x-error=${back}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

// A mode that wants Do Not Disturb started (or it was switched on during the mode)
export async function dndOnForMode(): Promise<void> {
  if (!CAN_RUN_SHORTCUTS || modoTurnedItOn) return;
  if (!(await loadShortcutsAdded())) return;
  if (await runShortcut(DND_SHORTCUTS.on.name)) modoTurnedItOn = true;
}

// The mode ended (or Do Not Disturb was switched off during the mode)
export async function dndOffForMode(): Promise<void> {
  if (!CAN_RUN_SHORTCUTS || !modoTurnedItOn) return;
  modoTurnedItOn = false;
  await runShortcut(DND_SHORTCUTS.off.name);
}

// For a running mode's DO NOT DISTURB checkbox. Turns it on when the mode starts if the mode wants it.
export function useModeDnd(startOn: boolean) {
  const [on, setOn] = useState(startOn);

  useEffect(() => {
    if (startOn) void dndOnForMode();
    // Only when the mode first opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    on,
    set: (next: boolean) => {
      setOn(next);
      void (next ? dndOnForMode() : dndOffForMode());
    },
  };
}

// ---------- Links ----------

// Opens one of the shared shortcuts so they can tap "Get Shortcut"
export function openDndShortcutLink(which: 'on' | 'off'): void {
  void Linking.openURL(DND_SHORTCUTS[which].link).catch(() => {});
}

// Android: the Do Not Disturb settings page (or sound settings if a phone doesn't have that page)
export async function openPhoneDndSettings(): Promise<void> {
  try {
    await Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS');
  } catch {
    await Linking.sendIntent('android.settings.SOUND_SETTINGS').catch(() => {});
  }
}
