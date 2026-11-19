import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { cancelTimerNotification, scheduleAlarmNotification } from '../timer/timerNotifications';
import { formatAlarmTime, nextAlarmDate, timeUntil } from './alarmTime';

// An alarm that belongs to a mode while it's on.
// It rings at the next time the phone's clock shows `time` (later today, or tomorrow).
// Ending the mode (closing the screen) turns the alarm off.
//  - App open: the screen shows a full-screen alarm and the phone vibrates until you stop it.
//  - App in the background: a phone notification goes off at that time (when notifications are on).

const SNOOZE_MINUTES = 5;
// If the app was closed when the alarm went off, don't start ringing when it's opened much later
const LATE_RING_LIMIT_MS = 10 * 60 * 1000;

type Options = {
  initialTime: string; // "HH:MM"
  initialEnabled: boolean;
  label: string; // shown in the notification, like "Sleep mode"
};

export function useAlarm({ initialTime, initialEnabled, label }: Options) {
  const [enabled, setEnabledState] = useState(initialEnabled);
  const [time, setTimeState] = useState(initialTime);
  // When it will ring, in milliseconds (null = not set, or already rang)
  const [ringsAt, setRingsAt] = useState<number | null>(() =>
    initialEnabled ? nextAlarmDate(initialTime, Date.now()).getTime() : null,
  );
  const [ringing, setRinging] = useState(false);
  const [rangAt, setRangAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ring when the time comes (and check again whenever the app comes back to the front)
  useEffect(() => {
    if (ringsAt === null || ringing) return;

    const check = () => {
      const current = Date.now();
      setNow(current);
      if (current < ringsAt) return;

      if (current - ringsAt <= LATE_RING_LIMIT_MS) {
        setRinging(true);
      } else {
        // It went off a while ago while the app was closed
        setRangAt(ringsAt);
        setRingsAt(null);
      }
    };

    const exact = setTimeout(check, Math.max(0, ringsAt - Date.now()) + 50);
    const display = setInterval(check, 30_000); // keeps "rings in..." up to date
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });

    return () => {
      clearTimeout(exact);
      clearInterval(display);
      subscription.remove();
    };
  }, [ringsAt, ringing]);

  // A phone notification at that time, in case the app isn't open
  useEffect(() => {
    if (ringsAt === null) return;

    let cancelled = false;
    let id: string | null = null;
    void scheduleAlarmNotification(new Date(ringsAt), '⏰ Alarm', `${label}: it's ${formatAlarmTime(time)}`).then(
      (scheduled) => {
        if (cancelled) void cancelTimerNotification(scheduled);
        else id = scheduled;
      },
    );

    return () => {
      cancelled = true;
      void cancelTimerNotification(id);
    };
  }, [ringsAt, time, label]);

  // Each change reads the clock again, so "rings in..." is right straight away
  function setEnabled(on: boolean) {
    const current = Date.now();
    setNow(current);
    setEnabledState(on);
    setRinging(false);
    setRangAt(null);
    setRingsAt(on ? nextAlarmDate(time, current).getTime() : null);
  }

  function setTime(next: string) {
    setTimeState(next);
    if (!enabled) return;
    const current = Date.now();
    setNow(current);
    setRinging(false);
    setRangAt(null);
    setRingsAt(nextAlarmDate(next, current).getTime());
  }

  function stop() {
    setRinging(false);
    setRangAt(ringsAt);
    setRingsAt(null);
  }

  function snooze() {
    const current = Date.now();
    setNow(current);
    setRinging(false);
    setRingsAt(current + SNOOZE_MINUTES * 60 * 1000);
  }

  let status: string;
  if (!enabled) status = 'Alarm off';
  else if (ringing) status = 'Ringing now';
  else if (ringsAt !== null) status = `Rings in ${timeUntil(ringsAt - now)}`;
  else if (rangAt !== null) status = `Went off at ${formatAlarmTime(time)}`;
  else status = 'Alarm off';

  return {
    enabled,
    time,
    ringing,
    status,
    snoozeMinutes: SNOOZE_MINUTES,
    setEnabled,
    setTime,
    stop,
    snooze,
  };
}

export type Alarm = ReturnType<typeof useAlarm>;
