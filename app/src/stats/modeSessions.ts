import { supabase } from '../../lib/supabase';
import type { ModeSession } from './statsMath';

// Call this when a mode turns ON.
// It automatically ends whatever mode was on before, so only one is ever on.
export async function startModeSession(modeId: string): Promise<boolean> {
  const { error } = await supabase.rpc('start_mode_session', { p_mode_id: modeId });
  if (error) {
    // Don't stop the mode from working just because stats couldn't save
    console.warn('Could not save mode start:', error.message);
    return false;
  }
  return true;
}

// Call this when a mode turns OFF.
export async function endModeSession(): Promise<boolean> {
  const { error } = await supabase.rpc('end_mode_session');
  if (error) {
    console.warn('Could not save mode end:', error.message);
    return false;
  }
  return true;
}

type SessionRow = {
  id: string;
  mode_id: string;
  started_at: string;
  ended_at: string | null;
};

// Loads the logged in user's sessions since a date.
// Row Level Security makes sure people only ever get their own rows.
export async function fetchSessions(since: Date, now: Date = new Date()): Promise<ModeSession[]> {
  const { data, error } = await supabase
    .from('mode_sessions')
    .select('id, mode_id, started_at, ended_at')
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as SessionRow[]).map((row) => ({
    id: row.id,
    modeId: row.mode_id,
    startedAt: row.started_at,
    // A mode that's still on counts up until right now
    endedAt: row.ended_at ?? now.toISOString(),
  }));
}