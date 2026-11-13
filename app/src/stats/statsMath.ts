// All the math for the stats screen.
// Nothing in here cares whether the sessions are fake or real, so when we
// switch to real data from Supabase, this file shouldn't need to change.

// One time a mode was on, from start to finish
export type ModeSession = {
  id: string;
  modeId: string; // 'study', 'sleep', 'commute', or a custom mode's id
  startedAt: string; // ISO date string, same format Supabase timestamps come back in
  endedAt: string;
};

// A weekly goal, like "10 hours of Study" or "Sleep mode 7 days a week"
export type ModeGoal = {
  modeId: string;
  kind: 'hours' | 'days';
  target: number;
};

export type ModeWeekSummary = {
  modeId: string;
  minutes: number; // time in this mode so far this week
  lastWeekMinutes: number; // time in this mode by this same point last week
  timesUsed: number;
  daysUsed: number;
};

export type DayBreakdown = {
  label: string;
  byMode: Record<string, number>; // minutes per mode that day
  total: number;
  isToday: boolean;
  isFuture: boolean;
};

export type Headline =
  | { kind: 'up'; summary: ModeWeekSummary; change: number }
  | { kind: 'most'; summary: ModeWeekSummary }
  | null;

export type GoalProgress = {
  current: number; // minutes for hours goals, days for days goals
  target: number; // same units as current
  fraction: number; // 0 to 1, for the progress bar
  done: boolean;
  onTrack: boolean;
};

const MINUTE_MS = 60 * 1000;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const TIME_BUCKET_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

// ---------- Dates ----------

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Weeks start on Monday
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

// ---------- Sessions ----------

export function sessionMinutes(session: ModeSession): number {
  const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
  return Math.max(0, ms / MINUTE_MS);
}

// Sessions that STARTED between `from` (included) and `to` (not included)
function sessionsBetween(sessions: ModeSession[], from: Date, to: Date) {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return sessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    return t >= fromMs && t < toMs;
  });
}

function totalMinutes(sessions: ModeSession[]) {
  return sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
}

function distinctDays(sessions: ModeSession[]) {
  return new Set(sessions.map((s) => startOfDay(new Date(s.startedAt)).getTime())).size;
}

// Only the sessions from the last few weeks
export function recentSessions(sessions: ModeSession[], now: Date, weeks: number) {
  return sessionsBetween(sessions, addDays(startOfDay(now), -7 * weeks + 1), now);
}

// ---------- This week vs last week ----------

// Compares this week so far to the SAME point last week (Monday until right now).
// That way on a Tuesday you're not comparing 2 days against a whole week.
export function summarizeWeek(
  sessions: ModeSession[],
  modeIds: string[],
  now: Date = new Date(),
): ModeWeekSummary[] {
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const thisWeek = sessionsBetween(sessions, thisWeekStart, now);
  const lastWeek = sessionsBetween(sessions, lastWeekStart, addDays(now, -7));

  return modeIds.map((modeId) => {
    const mine = thisWeek.filter((s) => s.modeId === modeId);
    const before = lastWeek.filter((s) => s.modeId === modeId);
    return {
      modeId,
      minutes: totalMinutes(mine),
      lastWeekMinutes: totalMinutes(before),
      timesUsed: mine.length,
      daysUsed: distinctDays(mine),
    };
  });
}

// Minutes per mode for each day Monday to Sunday of this week (for the bar chart)
export function dailyBreakdown(
  sessions: ModeSession[],
  modeIds: string[],
  now: Date = new Date(),
): DayBreakdown[] {
  const weekStart = startOfWeek(now);

  return DAY_LABELS.map((label, i) => {
    const dayStart = addDays(weekStart, i);
    const daySessions = sessionsBetween(sessions, dayStart, addDays(dayStart, 1));

    const byMode: Record<string, number> = {};
    let total = 0;
    for (const id of modeIds) {
      byMode[id] = totalMinutes(daySessions.filter((s) => s.modeId === id));
      total += byMode[id];
    }

    return {
      label,
      byMode,
      total,
      isToday: isSameDay(dayStart, now),
      isFuture: dayStart.getTime() > now.getTime(),
    };
  });
}

// The one thing worth saying at the top of the screen
export function pickHeadline(summaries: ModeWeekSummary[]): Headline {
  // First choice: the mode that grew the most compared to last week (at least 30 min)
  let biggest: ModeWeekSummary | undefined;
  let biggestChange = 0;
  for (const s of summaries) {
    const change = s.minutes - s.lastWeekMinutes;
    if (change > biggestChange) {
      biggest = s;
      biggestChange = change;
    }
  }
  if (biggest && biggestChange >= 30) {
    return { kind: 'up', summary: biggest, change: biggestChange };
  }

  // Otherwise: the mode used the most this week
  let most: ModeWeekSummary | undefined;
  for (const s of summaries) {
    if (!most || s.minutes > most.minutes) most = s;
  }
  if (most && most.minutes > 0) {
    return { kind: 'most', summary: most };
  }

  return null;
}

// ---------- Streaks ----------

// How many days in a row this mode was used.
// If it hasn't been used yet today, the streak can still be alive from yesterday.
export function currentStreak(sessions: ModeSession[], modeId: string, now: Date = new Date()) {
  const usedDays = new Set(
    sessions
      .filter((s) => s.modeId === modeId)
      .map((s) => startOfDay(new Date(s.startedAt)).getTime()),
  );

  let day = startOfDay(now);
  if (!usedDays.has(day.getTime())) day = addDays(day, -1);

  let streak = 0;
  while (usedDays.has(day.getTime())) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

// ---------- Goals ----------

export function goalProgress(
  goal: ModeGoal,
  summary: ModeWeekSummary | undefined,
  now: Date = new Date(),
): GoalProgress {
  const current = goal.kind === 'hours' ? (summary?.minutes ?? 0) : (summary?.daysUsed ?? 0);
  const target = goal.kind === 'hours' ? goal.target * 60 : goal.target;
  const fraction = target > 0 ? Math.min(current / target, 1) : 0;

  // "On track" means you're at least as far along as the number of full days
  // that have passed this week (so Wednesday afternoon expects 2 of 7 days' worth)
  const fullDaysPassed = Math.round(
    (startOfDay(now).getTime() - startOfWeek(now).getTime()) / (24 * 60 * MINUTE_MS),
  );
  const expected = fullDaysPassed / 7;

  return {
    current,
    target,
    fraction,
    done: current >= target,
    onTrack: fraction >= expected,
  };
}

// ---------- Time of day ----------

// Splits the day into 8 chunks of 3 hours and counts how often the mode starts in each
export function timeOfDayPattern(sessions: ModeSession[], modeId: string) {
  const counts: number[] = new Array(8).fill(0);
  for (const s of sessions) {
    if (s.modeId !== modeId) continue;
    const hour = new Date(s.startedAt).getHours();
    counts[Math.floor(hour / 3)] += 1;
  }

  const max = Math.max(...counts);
  const peak = max > 0 ? counts.indexOf(max) : -1;

  return {
    counts,
    max,
    usualTime: peak === -1 ? null : timeRangeLabel(peak * 3, peak * 3 + 3),
  };
}

function hourParts(hour: number) {
  const h = hour % 24;
  return { h12: h % 12 === 0 ? 12 : h % 12, period: h < 12 ? 'AM' : 'PM' };
}

// 18, 21 -> "6 to 9 PM"    21, 24 -> "9 PM to 12 AM"
function timeRangeLabel(startHour: number, endHour: number) {
  const a = hourParts(startHour);
  const b = hourParts(endHour);
  if (a.period === b.period) return `${a.h12} to ${b.h12} ${b.period}`;
  return `${a.h12} ${a.period} to ${b.h12} ${b.period}`;
}

// ---------- Formatting ----------

// 750 -> "12h 30m",  45 -> "45m",  120 -> "2h"
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// 130 -> "+2h 10m",  -45 -> "-45m",  0 -> "Same"
export function formatChange(minutes: number): string {
  if (Math.abs(minutes) < 1) return 'Same';
  return `${minutes > 0 ? '+' : '-'}${formatMinutes(Math.abs(minutes))}`;
}