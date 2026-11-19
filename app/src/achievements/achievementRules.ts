import { achievements, RARITY_XP } from './achievementCatalog';

// Works out every achievement's progress from what the person has done.
// Nothing in here talks to Supabase, so it's easy to test.

// One time a mode was on
export type SessionFact = {
  modeId: string; // 'study', 'sleep', 'commute', or a custom mode's id
  start: Date;
  end: Date; // right now, if the mode is still on
  ended: boolean; // false while the mode is still on
};

// Things that don't show up in mode sessions, counted as they happen
export type AchievementEvents = {
  modesCreated?: number;
  presetsEdited?: number;
  modesEdited?: number;
  avatarChanged?: number;
  colorChanged?: number;
};

export type AchievementEventName = keyof AchievementEvents;

export type Progress = { current: number; target: number };

export const PRESET_MODE_IDS = ['study', 'sleep', 'commute'];

// "Unlock N achievements" ones. They're checked after everything else.
const MILESTONES: Record<number, number> = {
  28: 5,
  29: 10,
  53: 15,
  54: 20,
  55: 25,
  71: 30,
  73: 40,
  75: 50,
  88: 60,
  90: 75,
  96: 90,
  97: 99, // every other achievement
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// ---------- Dates (all in the phone's own time zone) ----------

// "2026-11-19"
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function nextDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + 1, 12));
}

// Monday of that week, as a day key
function weekKey(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7), 12);
  return dayKey(monday);
}

// Longest run of days in a row
function longestStreak(days: Set<string>): number {
  let best = 0;
  for (const day of days) {
    // Only count from the first day of each run
    const [y, m, d] = day.split('-').map(Number);
    if (days.has(dayKey(new Date(y, m - 1, d - 1, 12)))) continue;
    let length = 1;
    let next = nextDayKey(day);
    while (days.has(next)) {
      length++;
      next = nextDayKey(next);
    }
    best = Math.max(best, length);
  }
  return best;
}

const minutesOf = (s: SessionFact) => Math.max(0, (s.end.getTime() - s.start.getTime()) / MINUTE_MS);

// ---------- Summary of everything they've done ----------

type ModeSummary = { count: number; minutes: number; days: Set<string> };

export type ActivitySummary = ReturnType<typeof summarize>;

export function summarize(sessions: SessionFact[]) {
  const sorted = [...sessions].sort((a, b) => a.start.getTime() - b.start.getTime());

  const perMode = new Map<string, ModeSummary>();
  const days = new Set<string>();
  const modesByDay = new Map<string, Set<string>>();
  const minutesByDay = new Map<string, number>();
  const countByWeek = new Map<string, number>();
  const modesByWeek = new Map<string, Set<string>>();
  const mondays = new Set<string>();
  const daysWith10MinSession = new Set<string>();
  const daysWith25MinSession = new Set<string>();
  const modesWith25MinSession = new Set<string>();

  let totalMinutes = 0;
  let longestEndedMinutes = 0;
  let sessions25Min = 0;
  let earlyWorm = false;
  let nightOwl = false;
  let comeback = false;

  sorted.forEach((s, i) => {
    const day = dayKey(s.start);
    const minutes = minutesOf(s);
    totalMinutes += minutes;
    days.add(day);

    const mode = perMode.get(s.modeId) ?? { count: 0, minutes: 0, days: new Set<string>() };
    mode.count++;
    mode.minutes += minutes;
    mode.days.add(day);
    perMode.set(s.modeId, mode);

    if (!modesByDay.has(day)) modesByDay.set(day, new Set());
    modesByDay.get(day)!.add(s.modeId);
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + minutes);

    const week = weekKey(s.start);
    countByWeek.set(week, (countByWeek.get(week) ?? 0) + 1);
    if (!modesByWeek.has(week)) modesByWeek.set(week, new Set());
    modesByWeek.get(week)!.add(s.modeId);

    if (s.start.getDay() === 1) mondays.add(day);

    // "Complete a session" only counts sessions that have ended
    if (s.ended) {
      longestEndedMinutes = Math.max(longestEndedMinutes, minutes);
      if (minutes >= 10) daysWith10MinSession.add(day);
      if (minutes >= 25) {
        daysWith25MinSession.add(day);
        modesWith25MinSession.add(s.modeId);
        sessions25Min++;
      }
    }

    const hour = s.start.getHours();
    if (hour >= 4 && hour < 7) earlyWorm = true; // before 7 AM (but not the middle of the night)
    if (hour >= 23 || hour < 4) nightOwl = true; // after 11 PM

    // Back after a week or more away
    const previous = sorted[i - 1];
    if (previous && s.start.getTime() - previous.end.getTime() >= 7 * DAY_MS) comeback = true;
  });

  const modes = [...perMode.entries()];
  const max = (values: number[]) => values.reduce((a, b) => Math.max(a, b), 0);

  // A Saturday followed by a Sunday, both with a mode
  const weekendWarrior = [...days].some((day) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getDay() === 6 && days.has(nextDayKey(day));
  });

  const perfectPair = [...modesByDay.values()].some((ids) => {
    const list = [...ids];
    return list.some((id) => PRESET_MODE_IDS.includes(id)) && list.some((id) => !PRESET_MODE_IDS.includes(id));
  });

  return {
    activations: sorted.length,
    customActivations: sorted.filter((s) => !PRESET_MODE_IDS.includes(s.modeId)).length,
    presetsUsed: PRESET_MODE_IDS.filter((id) => perMode.has(id)).length,
    totalMinutes,
    daysUsed: days.size,
    longestStreak: longestStreak(days),
    longestModeStreak: max(modes.map(([, m]) => longestStreak(m.days))),
    maxModeActivations: max(modes.map(([, m]) => m.count)),
    maxModeMinutes: max(modes.map(([, m]) => m.minutes)),
    maxModeDays: max(modes.map(([, m]) => m.days.size)),
    modesWith5Days: modes.filter(([, m]) => m.days.size >= 5).length,
    modesWith5Hours: modes.filter(([, m]) => m.minutes >= 5 * 60).length,
    maxModesInDay: max([...modesByDay.values()].map((ids) => ids.size)),
    maxModesInWeek: max([...modesByWeek.values()].map((ids) => ids.size)),
    maxWeekActivations: max([...countByWeek.values()]),
    daysWith15Minutes: [...minutesByDay.values()].filter((m) => m >= 15).length,
    mondays: mondays.size,
    longestEndedMinutes,
    daysWith10MinSession: daysWith10MinSession.size,
    daysWith25MinSession: daysWith25MinSession.size,
    modesWith25MinSession: modesWith25MinSession.size,
    sessions25Min,
    earlyWorm,
    nightOwl,
    comeback,
    weekendWarrior,
    perfectPair,
  };
}

// ---------- Rules ----------

const goal = (current: number, target: number): Progress => ({ current: Math.min(current, target), target });
const yes = (done: boolean): Progress => ({ current: done ? 1 : 0, target: 1 });

// One rule for every achievement that isn't a milestone, by id (matches achievementCatalog.ts)
const RULES: Record<number, (s: ActivitySummary, e: Required<AchievementEvents>) => Progress> = {
  1: () => yes(true), // opened Modo
  2: (_, e) => goal(e.presetsEdited, 1),
  3: (_, e) => goal(e.modesCreated, 1),
  4: (_, e) => goal(e.avatarChanged, 1),
  5: (_, e) => goal(e.colorChanged, 1),
  6: (s) => goal(s.customActivations, 1),
  7: (_, e) => goal(e.modesCreated, 3),
  8: (s) => goal(s.activations, 3),
  9: (_, e) => goal(e.modesCreated, 5),
  10: (s) => goal(s.activations, 5),
  11: (s) => goal(s.presetsUsed, 3),
  12: (s) => goal(s.activations, 10),
  13: (s) => goal(s.activations, 15),
  14: (s) => goal(s.longestStreak, 3),
  15: (s) => goal(s.totalMinutes, 1),
  16: (s) => goal(s.totalMinutes, 5),
  17: (s) => goal(s.totalMinutes, 10),
  18: (s) => goal(s.totalMinutes, 15),
  19: (s) => goal(s.totalMinutes, 30),
  20: (s) => goal(s.totalMinutes, 60),
  21: (s) => goal(s.longestEndedMinutes, 1),
  22: (s) => goal(s.longestEndedMinutes, 5),
  23: (s) => goal(s.longestEndedMinutes, 10),
  24: (s) => goal(s.longestEndedMinutes, 25),
  25: (s) => goal(s.maxModeMinutes, 60),
  26: (s) => goal(s.maxModeDays, 2),
  27: (s) => goal(s.maxModesInDay, 2),
  30: (s) => goal(s.daysUsed, 5),
  31: (s) => goal(s.activations, 25),
  32: (s) => goal(s.activations, 50),
  33: (s) => goal(s.maxWeekActivations, 7), // weeks start on Monday
  34: (s) => goal(s.maxModeActivations, 10),
  35: (s) => goal(s.maxModeActivations, 25),
  36: (s) => goal(s.longestStreak, 7),
  37: (s) => goal(s.daysUsed, 14),
  38: (s) => yes(s.comeback),
  39: (s) => goal(s.maxModeDays, 5),
  40: (s) => goal(s.maxModeDays, 10),
  41: (s) => goal(s.mondays, 3),
  42: (s) => goal(s.totalMinutes, 90),
  43: (s) => goal(s.daysWith10MinSession, 3),
  44: (s) => goal(s.maxModesInWeek, 3),
  45: (s) => goal(s.daysWith15Minutes, 4),
  46: (s) => goal(s.totalMinutes, 5 * 60),
  47: (s) => goal(s.longestEndedMinutes, 90),
  48: (s) => goal(s.longestEndedMinutes, 120),
  49: (s) => goal(s.maxModeMinutes, 3 * 60),
  50: (s) => goal(s.maxModeMinutes, 5 * 60),
  51: (s) => yes(s.perfectPair),
  52: (_, e) => goal(e.modesEdited, 1),
  56: (s) => goal(s.activations, 100),
  57: (s) => goal(s.activations, 150),
  58: (s) => goal(s.activations, 200),
  59: (s) => goal(s.maxModeActivations, 50),
  60: (s) => goal(s.maxModeActivations, 75),
  61: (s) => goal(s.longestStreak, 14),
  62: (s) => goal(s.longestStreak, 21),
  63: (s) => goal(s.daysUsed, 30),
  64: (s) => goal(s.maxModeDays, 30),
  65: (s) => goal(s.maxModeDays, 15),
  66: (s) => goal(s.totalMinutes, 7 * 60),
  67: (s) => goal(s.totalMinutes, 10 * 60),
  68: (s) => goal(s.maxModeMinutes, 10 * 60),
  69: (s) => goal(s.maxModeMinutes, 25 * 60),
  70: (s) => goal(s.modesWith5Days, 3), // 3 modes that were each used on 5 different days
  72: (s) => goal(s.modesWith25MinSession, 4),
  74: (s) => goal(s.daysWith25MinSession, 10),
  76: (s) => goal(s.activations, 250),
  77: (s) => goal(s.activations, 300),
  78: (s) => goal(s.maxModeActivations, 100),
  79: (s) => goal(s.daysUsed, 50),
  80: (s) => goal(s.longestModeStreak, 30),
  81: (s) => goal(s.totalMinutes, 12 * 60),
  82: (s) => goal(s.totalMinutes, 15 * 60),
  83: (s) => goal(s.totalMinutes, 20 * 60),
  84: (s) => goal(s.totalMinutes, 24 * 60),
  85: (s) => goal(s.totalMinutes, 36 * 60),
  86: (s) => goal(s.maxModeMinutes, 50 * 60),
  87: (s) => goal(s.modesWith5Hours, 3),
  89: (s) => goal(s.sessions25Min, 50),
  91: (s) => goal(s.activations, 500),
  92: (s) => goal(s.activations, 750),
  93: (s) => goal(s.daysUsed, 365),
  94: (s) => goal(s.maxModeDays, 100),
  95: (s) => goal(s.maxModeMinutes, 100 * 60),
  98: (s) => yes(s.earlyWorm),
  99: (s) => yes(s.nightOwl),
  100: (s) => yes(s.weekendWarrior),
};

export type AchievementResult = {
  progress: Record<number, Progress>;
  unlocked: Set<number>; // everything unlocked, old and new
  newlyUnlocked: number[];
};

// alreadyUnlocked: ids saved from before. Once unlocked, always unlocked.
export function evaluateAchievements(
  sessions: SessionFact[],
  events: AchievementEvents,
  alreadyUnlocked: Iterable<number>,
): AchievementResult {
  const summary = summarize(sessions);
  const counts: Required<AchievementEvents> = {
    modesCreated: events.modesCreated ?? 0,
    presetsEdited: events.presetsEdited ?? 0,
    modesEdited: events.modesEdited ?? 0,
    avatarChanged: events.avatarChanged ?? 0,
    colorChanged: events.colorChanged ?? 0,
  };

  const before = new Set(alreadyUnlocked);
  const unlocked = new Set(before);
  const progress: Record<number, Progress> = {};

  for (const [id, rule] of Object.entries(RULES)) {
    const p = rule(summary, counts);
    progress[Number(id)] = p;
    if (p.current >= p.target) unlocked.add(Number(id));
  }

  // Milestones can unlock other milestones, so keep checking until nothing changes
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, target] of Object.entries(MILESTONES)) {
      const n = Number(id);
      const others = unlocked.size - (unlocked.has(n) ? 1 : 0);
      progress[n] = goal(others, target);
      if (!unlocked.has(n) && others >= target) {
        unlocked.add(n);
        changed = true;
      }
    }
  }

  const newlyUnlocked = achievements.map((a) => a.id).filter((id) => unlocked.has(id) && !before.has(id));
  return { progress, unlocked, newlyUnlocked };
}

// Percent shown on the card (never says 100% until it's actually unlocked)
export function progressPercent(p: Progress | undefined): number {
  if (!p || p.target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((p.current / p.target) * 100)));
}

export function xpFor(ids: Iterable<number>): number {
  let total = 0;
  for (const id of ids) {
    const achievement = achievements.find((a) => a.id === id);
    if (achievement) total += RARITY_XP[achievement.rarity];
  }
  return total;
}
