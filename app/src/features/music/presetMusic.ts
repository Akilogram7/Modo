import { supabase } from '../../../lib/supabase';
import { normalizeSpotifyPlaylist } from './spotify';

export type MusicPresetKey = 'study' | 'commute';

export type PresetMusic = {
  enabled: boolean;
  playlistName: string;
  playlistUrl: string;
};

export const EMPTY_PRESET_MUSIC: PresetMusic = {
  enabled: false,
  playlistName: '',
  playlistUrl: '',
};

export async function loadPresetMusic(
  mode: MusicPresetKey,
): Promise<PresetMusic> {
  const { data, error } = await supabase
    .from('preset_mode_settings')
    .select('music_enabled, playlist_name, playlist_url')
    .eq('mode_id', mode)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { ...EMPTY_PRESET_MUSIC };
  }

  return {
    enabled: data.music_enabled,
    playlistName: data.playlist_name ?? '',
    playlistUrl: data.playlist_url ?? '',
  };
}

export async function savePresetMusic(
  mode: MusicPresetKey,
  settings: PresetMusic,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in.');

  const normalizedUrl = settings.enabled
    ? normalizeSpotifyPlaylist(settings.playlistUrl)
    : null;

  if (settings.enabled && !normalizedUrl) {
    throw new Error('Enter a valid Spotify playlist link.');
  }

  const { error } = await supabase
    .from('preset_mode_settings')
    .upsert(
      {
        user_id: user.id,
        mode_id: mode,
        music_enabled: settings.enabled,
        playlist_name: settings.enabled
          ? settings.playlistName.trim()
          : null,
        playlist_url: normalizedUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,mode_id' },
    );

  if (error) throw error;
}
