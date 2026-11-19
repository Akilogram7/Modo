import { supabase } from '../../lib/supabase';
import type { CustomMode } from '../types/mode';
import { toAlarmList } from '../features/alarm/alarmList';

export type NewCustomMode = Omit<CustomMode, 'id'>;

// The columns we read back from the modes table.
const MODE_COLUMNS =
    'id, name, color, character, timer_enabled, timer_duration, feature_settings';

// Convert a mode from our screens into database columns.
// Used when creating AND editing, so both always save the same fields.
function toModeColumns(mode: NewCustomMode) {
    return {
        name: mode.name,
        color: mode.color,
        character: mode.character,
        timer_enabled: mode.timerEnabled,
        timer_duration: mode.timerEnabled
            ? mode.timerDuration
            : null,

        feature_settings: {
            music: {
                enabled: mode.musicEnabled,
                playlistUrl: mode.musicEnabled
                    ? mode.playlistUrl
                    : null,
                playlistName: mode.musicEnabled
                    ? mode.playlistName
                    : null,
            },
            weather: {
                enabled: mode.weatherEnabled,
            },
            timer: {
                breakMinutes: mode.timerEnabled
                    ? (mode.breakMinutes ?? 0)
                    : 0,
            },
            alarm: {
                enabled: mode.alarmEnabled,
                alarms: mode.alarmEnabled
                    ? mode.alarms
                    : [],
            },
            maps: {
                enabled: mode.mapEnabled,
                destination: mode.mapDestination,
                travelMode: mode.mapTravelMode,
            },
            scratchpad: {
                enabled: mode.scratchpadEnabled,
            },
        },

    };
}

// Convert a database row into the format our screens use.
export function toCustomMode(row: any): CustomMode {
    console.log('Supabase music settings:', row.feature_settings);
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        character: row.character,
        timerEnabled: row.timer_enabled,
        timerDuration: row.timer_duration,
        musicEnabled: row.feature_settings?.music?.enabled ?? false,
        playlistUrl: row.feature_settings?.music?.playlistUrl ?? null,
        playlistName: row.feature_settings?.music?.playlistName ?? null,
        weatherEnabled: row.feature_settings?.weather?.enabled ?? false,
        breakMinutes: row.feature_settings?.timer?.breakMinutes ?? 0,
        alarmEnabled: row.feature_settings?.alarm?.enabled ?? false,
        alarms: toAlarmList(row.feature_settings?.alarm),
        mapEnabled: row.feature_settings?.maps?.enabled ?? false,

        mapDestination:
            row.feature_settings?.maps?.destination ?? null,

        mapTravelMode:
            row.feature_settings?.maps?.travelMode === 'walking'
                ? 'walking'
                : 'driving',

        scratchpadEnabled:
            row.feature_settings?.scratchpad?.enabled ?? false,
    };
}

// Load only the signed-in user's modes.
// RLS also enforces ownership on the database side.
export async function fetchCustomModes(): Promise<CustomMode[]> {
    const { data, error } = await supabase
        .from('modes')
        .select(MODE_COLUMNS)
        // The order the user chose on the Modes screen comes first.
        // Modes that were never moved have no sort_order, so they go last, oldest first.
        .order('sort_order', { ascending: true, nullsFirst: false })
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
            ...toModeColumns(mode),
        })
        .select(MODE_COLUMNS)
        .single();

    if (error) throw error;

    return toCustomMode(data);
}

// Save changes to a mode the user already made.
export async function updateCustomMode(
    id: string,
    mode: NewCustomMode,
): Promise<CustomMode> {
    const { data, error } = await supabase
        .from('modes')
        .update(toModeColumns(mode))
        .eq('id', id)
        .select(MODE_COLUMNS)
        .maybeSingle();

    if (error) throw error;
    // No row back means the database didn't let us change it.
    if (!data) throw new Error('This mode could not be updated.');

    return toCustomMode(data);
}

// Delete one of the user's modes for good.
export async function deleteCustomMode(id: string): Promise<void> {
    const { data, error } = await supabase
        .from('modes')
        .delete()
        .eq('id', id)
        .select('id');

    if (error) throw error;
    // No row back means the database didn't let us delete it.
    if (!data || data.length === 0) {
        throw new Error('This mode could not be deleted.');
    }
}

// Save the order of the user's modes. The first id in the list shows first.
export async function saveCustomModeOrder(orderedIds: string[]): Promise<void> {
    const results = await Promise.all(
        orderedIds.map((id, index) =>
            supabase
                .from('modes')
                .update({ sort_order: index })
                .eq('id', id)
                .select('id'),
        ),
    );

    for (const { data, error } of results) {
        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('The new order could not be saved.');
        }
    }
}
