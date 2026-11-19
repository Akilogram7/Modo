import { supabase } from '../../../lib/supabase';
import {
  EMPTY_MAP_SETTINGS,
  type SavedMapSettings,
} from './mapTypes';

export type MapPresetKey = 'commute';

export async function loadPresetMaps(
  mode: MapPresetKey,
): Promise<SavedMapSettings> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in.');

  const { data, error } = await supabase
    .from('preset_mode_settings')
    .select('map_enabled, map_destination, map_travel_mode')
    .eq('user_id', user.id)
    .eq('mode_id', mode)
    .maybeSingle();

  if (error) throw error;

  if (!data) return { ...EMPTY_MAP_SETTINGS };

  const destination = data.map_destination;

  const validDestination =
    destination &&
    typeof destination.latitude === 'number' &&
    Number.isFinite(destination.latitude) &&
    Math.abs(destination.latitude) <= 90 &&
    typeof destination.longitude === 'number' &&
    Number.isFinite(destination.longitude) &&
    Math.abs(destination.longitude) <= 180 &&
    typeof destination.label === 'string';

  return {
    enabled: data.map_enabled ?? true,
    destination: validDestination ? destination : null,
    travelMode:
      data.map_travel_mode === 'walking' ? 'walking' : 'driving',
  };
}

export async function savePresetMaps(
  mode: MapPresetKey,
  settings: SavedMapSettings,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in.');

  const { error } = await supabase
    .from('preset_mode_settings')
    .upsert(
      {
        user_id: user.id,
        mode_id: mode,
        map_enabled: settings.enabled,
        map_destination: settings.destination,
        map_travel_mode: settings.travelMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,mode_id' },
    );

  if (error) throw error;
}
