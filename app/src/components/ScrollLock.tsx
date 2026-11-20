import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

// ---------- Scroll lock ----------
// Some things you drag your finger on sit inside screens that also scroll
// (the alarm time wheels, the scratchpad drawing). Without this, a swipe on them
// moves the whole page. While a finger is on one of them, the screen behind it holds still.

const ScrollLockContext = createContext<(locked: boolean) => void>(() => {});
const UNLOCK_MS = 300; // how long after letting go (or a wheel stopping) the screen can scroll again

// Use this instead of ScrollView on any screen that has a time picker or a drawing pad in it
export function LockableScrollView(props: ScrollViewProps) {
  const [locked, setLocked] = useState(false);
  return (
    <ScrollLockContext.Provider value={setLocked}>
      <ScrollView {...props} scrollEnabled={!locked && props.scrollEnabled !== false} />
    </ScrollLockContext.Provider>
  );
}

// lock() when a finger goes down, unlockSoon() when it lifts
export function useScrollLock() {
  const setLocked = useContext(ScrollLockContext);
  const locked = useRef(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelUnlock = () => {
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = null;
  };

  // Finger is down (or a wheel is still spinning): hold the screen still
  const lock = () => {
    cancelUnlock();
    if (!locked.current) {
      locked.current = true;
      setLocked(true);
    }
  };

  // Let the screen scroll again once everything has been quiet for a moment
  const unlockSoon = () => {
    cancelUnlock();
    unlockTimer.current = setTimeout(() => {
      unlockTimer.current = null;
      locked.current = false;
      setLocked(false);
    }, UNLOCK_MS);
  };

  // If the thing disappears (like tapping DONE), never leave the screen stuck
  useEffect(
    () => () => {
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
      if (locked.current) setLocked(false);
    },
    [setLocked],
  );

  return { lock, unlockSoon };
}
