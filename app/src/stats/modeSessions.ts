import { supabase } from '../../lib/supabase';
import type { ModeSession } from './statsMath';

// Other parts of the app (like achievements) can listen for modes starting and ending
const sessionListeners = new Set<() => void>();

export function onSessionChange(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function tellSessionListeners() {
  sessionListeners.forEach((listener) => listener());
}

// Call this when a mode turns ON.
// It automatically ends whatever mode was on before, so only one is ever on.
export async function startModeSession(modeId: string): Promise<boolean> {
  const { error } = await supabase.rpc('start_mode_session', { p_mode_id: modeId });
  if (error) {
    // Don't stop the mode from working just because stats couldn't save
    console.warn('Could not save mode start:', error.message);
    return false;
  }
  tellSessionListeners();
  return true;
}

// Call this when a mode turns OFF.
export async function endModeSession(): Promise<boolean> {
  const { error } = await supabase.rpc('end_mode_session');
  if (error) {
    console.warn('Could not save mode end:', error.message);
    return false;
  }
  tellSessionListeners();
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

// When each mode was last started, for the home screen's quick access.
// Gives back { modeId: time in milliseconds }.
export async function fetchLastUsed(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('mode_sessions')
    .select('mode_id, started_at')
    .order('started_at', { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);

  const lastUsed: Record<string, number> = {};
  for (const row of (data ?? []) as { mode_id: string; started_at: string }[]) {
    // Rows come newest first, so the first time we see a mode is its latest use
    if (lastUsed[row.mode_id] === undefined) {
      lastUsed[row.mode_id] = new Date(row.started_at).getTime();
    }
  }
  return lastUsed;
}
