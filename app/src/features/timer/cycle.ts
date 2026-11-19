// The math behind focus timers with breaks.
// A session goes focus -> break -> focus -> break... until it's stopped.
// With no breaks, it's one focus round that ends.
// Everything is worked out from "how many seconds since the timer started",
// so it's still right after the app was in the background.

export type PhaseKind = 'focus' | 'break' | 'done';

export type Phase = {
  kind: PhaseKind;
  secondsLeft: number; // left in this phase
  round: number; // 1 for the first focus round, 2 after the first break, and so on
};

export function phaseAt(elapsed: number, focusSeconds: number, breakSeconds: number): Phase {
  const time = Math.max(0, elapsed);

  if (focusSeconds <= 0) return { kind: 'done', secondsLeft: 0, round: 1 };

  // No breaks: one round, then done
  if (breakSeconds <= 0) {
    if (time >= focusSeconds) return { kind: 'done', secondsLeft: 0, round: 1 };
    return { kind: 'focus', secondsLeft: Math.ceil(focusSeconds - time), round: 1 };
  }

  // With breaks: repeat focus + break forever
  const cycle = focusSeconds + breakSeconds;
  const round = Math.floor(time / cycle) + 1;
  const intoCycle = time - (round - 1) * cycle;

  if (intoCycle < focusSeconds) {
    return { kind: 'focus', secondsLeft: Math.ceil(focusSeconds - intoCycle), round };
  }
  return { kind: 'break', secondsLeft: Math.ceil(cycle - intoCycle), round };
}

export type PhaseChange = {
  inSeconds: number; // how long from now
  kind: PhaseKind; // what starts then
  round: number;
};

// The next few times the timer switches (for scheduling notifications)
export function upcomingChanges(
  elapsed: number,
  focusSeconds: number,
  breakSeconds: number,
  count: number,
): PhaseChange[] {
  const changes: PhaseChange[] = [];
  let time = Math.max(0, elapsed);

  while (changes.length < count) {
    const phase = phaseAt(time, focusSeconds, breakSeconds);
    if (phase.kind === 'done') break;

    const at = time + phase.secondsLeft;
    // Look just past the switch to see what starts
    const next = phaseAt(at + 0.001, focusSeconds, breakSeconds);
    changes.push({ inSeconds: at - elapsed, kind: next.kind, round: next.round });
    time = at + 0.001;
  }

  return changes;
}

// 4500 -> "01:15:00"
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs].map((value) => value.toString().padStart(2, '0')).join(':');
}

// What the full-screen alert says when the timer switches
export function changeMessage(kind: PhaseKind, round: number, breakSeconds: number) {
  if (kind === 'break') {
    return {
      title: 'Break time!',
      body: `Take ${Math.round(breakSeconds / 60)} minutes. Your next focus round starts on its own.`,
    };
  }
  if (kind === 'focus') {
    return { title: 'Back to focus', body: `Round ${round} has started.` };
  }
  return { title: 'Session complete!', body: 'Your focus session is finished. Great work!' };
}
