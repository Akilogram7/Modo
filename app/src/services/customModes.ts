import { supabase } from '../../lib/supabase';
import type { CustomMode } from '../types/mode';

export type NewCustomMode = Omit<CustomMode, 'id'>;

// Convert a database row into the format our screens use.
function toCustomMode(row: any): CustomMode {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    character: row.character,
    timerEnabled: row.timer_enabled,
    timerDuration: row.timer_duration,
  };
}

// Load only the signed-in user's modes.
// RLS also enforces ownership on the database side.
export async function fetchCustomModes(): Promise<CustomMode[]> {
  const { data, error } = await supabase
    .from('modes')
    .select('id, name, color, character, timer_enabled, timer_duration')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(toCustomMode);
}

// Create a new mode and return its database-generated UUID.
export async function createCustomMode(
  mode: NewCustomMode,
): Promise<CustomMode> {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in to create a mode.');

  const { data, error } = await supabase
    .from('modes')
    .insert({
      user_id: user.id,
      name: mode.name,
      color: mode.color,
      character: mode.character,
      timer_enabled: mode.timerEnabled,
      timer_duration: mode.timerEnabled ? mode.timerDuration : null,
      feature_settings: {},
    })
    .select('id, name, color, character, timer_enabled, timer_duration')
    .single();

  if (error) throw error;

  return toCustomMode(data);
}
