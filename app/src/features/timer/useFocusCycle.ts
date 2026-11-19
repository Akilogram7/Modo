import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { changeMessage, phaseAt, upcomingChanges, type Phase, type PhaseKind } from './cycle';
import { cancelTimerNotification, scheduleAlertNotification } from './timerNotifications';

// Runs a focus timer, with or without breaks, and tells you when it switches.
// Used by your own timer (FocusTimer) and by friends following a host's timer (FollowTimer).

type Options = {
  running: boolean;
  startedAt: number | null; // when the timer would have been at 0, on this phone's clock (while running)
  pausedElapsed: number; // seconds the timer has run (while stopped), and the lowest it can show while running
  focusSeconds: number;
  breakSeconds: number; // 0 = no breaks
  onFinished?: () => void; // a timer with no breaks reached 0
};

export type CycleAlert = {
  kind: PhaseKind;
  title: string;
  body: string;
};

// How many upcoming switches get a phone notification (in case the app is closed)
const NOTIFY_AHEAD = 6;

export function useFocusCycle({
  running,
  startedAt,
  pausedElapsed,
  focusSeconds,
  breakSeconds,
  onFinished,
}: Options) {
  const [now, setNow] = useState(0);
  const [alert, setAlert] = useState<CycleAlert | null>(null);

  // The phase we last saw, so we only alert when it actually changes
  const lastPhaseRef = useRef<string | null>(null);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  const elapsed =
    running && startedAt !== null
      ? Math.max(pausedElapsed, (now - startedAt) / 1000)
      : pausedElapsed;
  const phase: Phase = phaseAt(elapsed, focusSeconds, breakSeconds);

  // Tick once a second while running, and catch up when the app comes back
  useEffect(() => {
    if (!running || startedAt === null) return;

    lastPhaseRef.current = null; // the first look after starting never alerts

    const tick = () => {
      const current = Date.now();
      setNow(current);

      const seen = Math.max(pausedElapsed, (current - startedAt) / 1000);
      const latest = phaseAt(seen, focusSeconds, breakSeconds);
      const key = `${latest.kind}-${latest.round}`;

      if (lastPhaseRef.current !== null && lastPhaseRef.current !== key) {
        setAlert({ kind: latest.kind, ...changeMessage(latest.kind, latest.round, breakSeconds) });
      }
      lastPhaseRef.current = key;

      if (latest.kind === 'done') onFinishedRef.current?.();
    };

    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      subscription.remove();
    };
  }, [running, startedAt, pausedElapsed, focusSeconds, breakSeconds]);

  // Phone notifications for the next few switches, in case the app is in the background.
  // They're all cancelled when the timer pauses, resets or the screen closes.
  useEffect(() => {
    if (!running || startedAt === null) return;

    let cancelled = false;
    const ids: (string | null)[] = [];
    const from = Math.max(pausedElapsed, (Date.now() - startedAt) / 1000);

    for (const change of upcomingChanges(from, focusSeconds, breakSeconds, NOTIFY_AHEAD)) {
      const { title, body } = changeMessage(change.kind, change.round, breakSeconds);
      void scheduleAlertNotification(change.inSeconds, title, body).then((id) => {
        if (cancelled) void cancelTimerNotification(id);
        else ids.push(id);
      });
    }

    return () => {
      cancelled = true;
      for (const id of ids) void cancelTimerNotification(id);
    };
  }, [running, startedAt, pausedElapsed, focusSeconds, breakSeconds]);

  return {
    elapsed,
    phase,
    alert,
    dismissAlert: () => setAlert(null),
  };
}
