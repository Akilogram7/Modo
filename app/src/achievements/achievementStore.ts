import { supabase } from '../../lib/supabase';
import type { AchievementEvents, SessionFact } from './achievementRules';

// Loading and saving achievements in Supabase.
// Each person has one row in user_achievements (see supabase/achievements.sql).

export type SavedAchievements = {
  unlocked: Record<string, string>; // achievement id -> when it was unlocked (ISO time)
  events: AchievementEvents;
};

export const EMPTY_SAVED: SavedAchievements = { unlocked: {}, events: {} };

// Gives back null if they don't have a row yet
export async function loadSavedAchievements(): Promise<SavedAchievements | null> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('unlocked, events')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    unlocked: (data.unlocked as Record<string, string>) ?? {},
    events: (data.events as AchievementEvents) ?? {},
  };
}

export async function saveAchievements(userId: string, saved: SavedAchievements): Promise<void> {
  const { error } = await supabase.from('user_achievements').upsert({
    user_id: userId,
    unlocked: saved.unlocked,
    events: saved.events,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

type SessionRow = { mode_id: string; started_at: string; ended_at: string | null };

const PAGE_SIZE = 1000; // Supabase sends at most 1000 rows at a time

// Every mode session they've ever had, oldest first
export async function fetchAllSessions(now: Date = new Date()): Promise<SessionFact[]> {
  const rows: SessionRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('mode_sessions')
      .select('mode_id, started_at, ended_at')
      .order('started_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as SessionRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows.map((row) => ({
    modeId: row.mode_id,
    start: new Date(row.started_at),
    end: row.ended_at ? new Date(row.ended_at) : now,
    ended: row.ended_at !== null,
  }));
}

// How many of their own modes exist right now (counts modes made before achievements existed)
export async function countOwnModes(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('modes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
