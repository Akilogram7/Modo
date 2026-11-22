import { supabase } from '../../lib/supabase';
import type { CustomModeInput } from '../types/mode';

export type PresetId = 'study' | 'sleep' | 'commute';

/** Load the saved editor configuration for a built-in preset. */
export async function loadPresetConfig(id: PresetId): Promise<CustomModeInput | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in.');

  const { data, error } = await supabase
    .from('preset_mode_settings')
    .select('mode_config')
    .eq('user_id', user.id)
    .eq('mode_id', id)
    .maybeSingle();
  if (error) throw error;
  return (data?.mode_config as CustomModeInput | null) ?? null;
}

/** Update the same preset row, without touching Spotify/Maps columns. */
export async function savePresetConfig(id: PresetId, config: CustomModeInput): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in.');

  const { error } = await supabase.from('preset_mode_settings').upsert({
    user_id: user.id,
    mode_id: id,
    mode_config: config,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,mode_id' });
  if (error) throw error;
}
