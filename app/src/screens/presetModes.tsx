import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, shadows } from '../../assets/theme';
import { useEffect, useState } from 'react';
import { FocusTimer } from '../features/timer';
import { endModeSession } from '../stats/modeSessions';
import {
  AlarmRow,
  MAX_ALARMS,
  newAlarm,
  toSleepAlarms,
  type ModeAlarm,
} from '../features/alarm';
import { supabase } from '../../lib/supabase';
import { LockableScrollView } from '../components/ScrollLock';
import type { CustomModeInput } from '../types/mode';
import { BlueLightCard, useBlueLight } from '../features/bluelight';
import { DndCard, dndOffForMode, useModeDnd } from '../features/dnd';
import { MusicSettings } from '../features/music';
import { CHARACTERS } from './createModeScreen';
import Scratchpad from '../features/scratchpad/Scratchpad';
import { savePresetConfig } from '../services/presetSettings';
export type PresetKey = 'study' | 'sleep' | 'commute';
import { useAuth } from '../providers/AuthProvider';
import { WeatherCard } from '../features/weather/WeatherCard';
import { MapCard } from '../features/maps/MapCard';
import {
  normalizeSpotifyPlaylist,
  openSpotifyPlaylist,
} from '../features/music';
import {
  EMPTY_PRESET_MUSIC,
  loadPresetMusic,
  savePresetMusic,
  type MusicPresetKey,
  type PresetMusic,
} from '../features/music/presetMusic';
import {
  EMPTY_MAP_SETTINGS,
  type SavedMapSettings,
} from '../features/maps/mapTypes';
import {
  loadPresetMaps,
  savePresetMaps,
} from '../features/maps/presetMaps';
// ─────────────── PRESET MODE COLOURS ───────────────
// gradientTop = light end, gradientBottom = main colour,
// accent = page title, checkboxes and buttons, text = labels, times and button text.
// (kept here so theme.ts doesn't change; can be moved into theme.ts later)
const presetModeColors: Record<
  PresetKey,
  { gradientTop: string; gradientBottom: string; accent: string; text: string }
> = {
  study: {
    gradientTop: '#C4CBEC',
    gradientBottom: '#6673AB',
    accent: '#1D2C6E',
    text: '#FFFFFF',
  },
  sleep: {
    gradientTop: '#EABCCF',
    gradientBottom: '#D982A5',
    accent: '#B34B75',
    text: '#FFFFFF',
  },
  commute: {
    gradientTop: '#D8FEEB',
    gradientBottom: '#91C7AC',
    accent: '#256344',
    text: '#FFFFFF',
  },
};
// same linear gradient on every mode page (from Figma: stops at 36% and 48%)
const GRADIENT_STOPS = [0.36, 0.48] as const;
const GRADIENT_START = { x: 1, y: 0 };
const GRADIENT_END = { x: 0.22, y: 0.735 };
type Row = {
  label: string;
  checked: boolean;
  box?: boolean; // shows an empty box under the row (Commute: your route, weather)
};
type Preset = {
  title: string;
  image: number;
  rows: Row[];
  time?: string; // big text under the rows
  timeNote?: string; // small text under the big text
};
const PRESETS: Record<PresetKey, Preset> = {
  study: {
    title: 'STUDY MODE',
    image: require('../../assets/Modos/ModoStudy.png'),
    rows: [
      { label: 'DO NOT DISTURB', checked: true },
      { label: 'PLAYLIST', checked: false },
      { label: 'TIMER', checked: true },
    ],
    time: '2:00:00',
  },
  sleep: {
    title: 'SLEEP MODE',
    image: require('../../assets/Modos/ModoSleep.png'),
    rows: [
      { label: 'BLUE LIGHT FILTER', checked: true },
      { label: 'DO NOT DISTURB', checked: false },
      { label: 'TIMER', checked: false },
      { label: 'ALARM SET', checked: true },
    ],
    time: '8:00 AM',
  },
  commute: {
    title: 'COMMUTE MODE',
    image: require('../../assets/Modos/ModoRun.png'),
    rows: [
      { label: 'PLAYLIST', checked: true },
      { label: 'YOUR ROUTE', checked: false, box: true },
      { label: 'WEATHER', checked: true, box: true },
    ],
  },
};
// blends a colour toward black (used for the panel behind the rows)
function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
type Props = {
  mode: PresetKey;
  config?: CustomModeInput;
  // Gets what this mode is set to right now, so the edit screen starts with it
  onChangeSettings?: (current: Partial<CustomModeInput>) => void;
  onEnd?: () => void;
};
export default function PresetModeScreen({ mode, config, onChangeSettings, onEnd }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const responsiveButtonFont = Math.max(
    18,
    Math.min(28, width * 0.065)
  );
  const preset = PRESETS[mode];
  const baseColors = presetModeColors[mode];
  const c = config ? {
    gradientTop: lighten(config.color, 0.46),
    gradientBottom: config.color,
    accent: darken(config.color, 0.4),
    text: '#FFFFFF',
  } : baseColors;
  const displayImage = config
    ? (config.character !== null ? CHARACTERS[config.character] : undefined)
    : preset.image;
  const rows: Row[] = config ? [
    ...(mode === 'sleep' ? [{ label: 'BLUE LIGHT FILTER', checked: true }] : []),
    ...(config.dndEnabled ? [{ label: 'DO NOT DISTURB', checked: true }] : []),
    ...(config.musicEnabled ? [{ label: 'PLAYLIST', checked: true }] : []),
    ...(config.timerEnabled ? [{ label: 'TIMER', checked: true }] : []),
    ...(config.alarmEnabled ? [{ label: 'ALARM SET', checked: true }] : []),
    ...(config.mapEnabled ? [{ label: 'YOUR ROUTE', checked: true }] : []),
    ...(config.weatherEnabled ? [{ label: 'WEATHER', checked: true }] : []),
    ...(config.scratchpadEnabled ? [{ label: 'SCRATCHPAD', checked: true }] : []),
  ] : preset.rows;
  const modoW = Math.min(width * 0.6, 260);
  const [timerEnabled, setTimerEnabled] = useState(config?.timerEnabled ?? (mode === 'study'));
  const [weatherEnabled, setWeatherEnabled] = useState(config?.weatherEnabled ?? (mode === 'commute'));
  const [scratchpadOn, setScratchpadOn] = useState(config?.scratchpadEnabled ?? false);
  //Supabase auth session (used to load/save preset music)
  const { session } = useAuth();
  const supportsMusic = !!config?.musicEnabled || mode === 'study' || mode === 'commute';
  const [music, setMusic] = useState<PresetMusic>({
    ...EMPTY_PRESET_MUSIC,
  });
  const [musicLoading, setMusicLoading] = useState(true);
  // Sleep mode's alarms. Each person's list (titles, times, on/off) is saved on their account.
  const savedSleepAlarms = toSleepAlarms(session?.user.user_metadata);
  const savedSleepJson = JSON.stringify(savedSleepAlarms);
  const [sleepAlarms, setSleepAlarms] = useState<ModeAlarm[]>(savedSleepAlarms);
  const effectiveAlarms = config ? config.alarms : sleepAlarms;
  const [alarmsOn, setAlarmsOn] = useState(config?.alarmEnabled ?? (mode === 'sleep'));
  // Blue light filter: a warm tint on a schedule (saved on their account)
  const blueLight = useBlueLight();
  useEffect(() => {
    if (mode === 'sleep') {
      blueLight.setModeActive(true);
    }
    return () => {
      if (mode === 'sleep') {
        blueLight.setModeActive(false);
      }
    };
  }, [mode, blueLight.setModeActive]);
  // Do Not Disturb: starts the way this preset's DO NOT DISTURB row is set (on for Study)
  const dnd = useModeDnd(
    config?.dndEnabled ?? PRESETS[mode].rows.some((r) => r.label === 'DO NOT DISTURB' && r.checked),
  );
  useEffect(() => {
    setTimerEnabled(config?.timerEnabled ?? mode === 'study');
    setWeatherEnabled(config?.weatherEnabled ?? mode === 'commute');
    setAlarmsOn(config?.alarmEnabled ?? mode === 'sleep');
    setScratchpadOn(config?.scratchpadEnabled ?? false);
  }, [mode, config]);
  const [justAddedAlarm, setJustAddedAlarm] = useState<string | null>(null);
  // Save changes a moment after they stop changing them
  useEffect(() => {
    if (mode !== 'sleep' || JSON.stringify(sleepAlarms) === savedSleepJson) return;
    const save = setTimeout(() => {
      void supabase.auth
        .updateUser({ data: { sleep_alarms: sleepAlarms } })
        .then(({ error }) => {
          if (error) console.warn('Could not save the alarms:', error.message);
        });
    }, 1500);
    return () => clearTimeout(save);
  }, [mode, sleepAlarms, savedSleepJson]);
  const [musicSaving, setMusicSaving] = useState(false);
  const [showMusicSettings, setShowMusicSettings] = useState(false);
  const [mapSettings, setMapSettings] =
    useState<SavedMapSettings>({ ...EMPTY_MAP_SETTINGS });
  const [mapSaving, setMapSaving] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setMusic({ ...EMPTY_PRESET_MUSIC });
    setShowMusicSettings(false);
    setMusicLoading(true);
    if (!session?.user.id || !supportsMusic) {
      setMusicLoading(false);
      return;
    }
    (mode === 'sleep' ? Promise.resolve({ ...EMPTY_PRESET_MUSIC }) : loadPresetMusic(mode as MusicPresetKey))
      .then((settings) => {
        if (!cancelled) {
          setMusic(config ? {
            enabled: config.musicEnabled,
            playlistName: config.playlistName ?? settings.playlistName,
            playlistUrl: config.playlistUrl ?? settings.playlistUrl,
          } : settings);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Unable to load preset music:', error);
          Alert.alert(
            'Music settings',
            'Unable to load your saved playlist.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMusicLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, session?.user.id, supportsMusic, config]);
  useEffect(() => {
    let cancelled = false;
    setMapSettings({ ...EMPTY_MAP_SETTINGS });
    setMapLoading(true);
    if ((mode !== 'commute' && !config?.mapEnabled) || !session?.user.id) {
      setMapLoading(false);
      return;
    }
    (mode === 'commute' ? loadPresetMaps('commute') : Promise.resolve({ ...EMPTY_MAP_SETTINGS }))
      .then((settings) => {
        if (!cancelled) {
          setMapSettings(config ? {
            enabled: config.mapEnabled,
            destination: config.mapDestination ?? settings.destination,
            travelMode: config.mapTravelMode ?? settings.travelMode,
          } : settings);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load maps:', error);
          Alert.alert(
            'Map settings',
            'Unable to load your saved destination.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMapLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, session?.user.id, config]);
  // Save music settings
  async function handleSaveMusic() {
    if (!supportsMusic || musicSaving) return;
    if (
      music.enabled &&
      !normalizeSpotifyPlaylist(music.playlistUrl)
    ) {
      Alert.alert(
        'Invalid playlist',
        'Please enter a valid Spotify playlist URL.',
      );
      return;
    }
    setMusicSaving(true);
    try {
      if (mode === 'sleep' && config) {
        await savePresetConfig(mode, {
          ...config, musicEnabled: music.enabled,
          playlistUrl: music.playlistUrl || null, playlistName: music.playlistName || null
        });
      } else {
        await savePresetMusic(mode as MusicPresetKey, music);
      }
      setShowMusicSettings(false);
      Alert.alert(
        'Saved!',
        'Your Spotify playlist settings have been saved.',
      );
    } catch (error) {
      console.error('Failed to save music:', error);
      Alert.alert(
        'Save failed',
        'Unable to save your Spotify settings.',
      );
    } finally {
      setMusicSaving(false);
    }
  }
  async function handleSaveMapSettings(
    settings: SavedMapSettings,
  ): Promise<void> {
    if (mode === 'commute') await savePresetMaps('commute', settings);
    else if (config) await savePresetConfig(mode, {
      ...config, mapEnabled: settings.enabled,
      mapDestination: settings.destination, mapTravelMode: settings.travelMode
    });
    setMapSettings(settings);
  }
  // Toggle Maps without discarding the saved destination.
  async function handleToggleMaps(): Promise<void> {
    if (mapLoading || mapSaving || !session?.user.id) return;
    const nextSettings: SavedMapSettings = {
      ...mapSettings,
      enabled: !mapSettings.enabled,
    };
    setMapSaving(true);
    try {
      if (mode === 'commute') await savePresetMaps('commute', nextSettings);
      else if (config) await savePresetConfig(mode, {
        ...config, mapEnabled: nextSettings.enabled,
        mapDestination: nextSettings.destination, mapTravelMode: nextSettings.travelMode
      });
      setMapSettings(nextSettings);
    } catch (error) {
      console.error('Failed to toggle Maps:', error);
      Alert.alert('Map settings', 'Unable to update your Maps preference.');
    } finally {
      setMapSaving(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[c.gradientTop, c.gradientBottom]}
        locations={GRADIENT_STOPS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={{ flex: 1 }}
      >
        <LockableScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 180,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.title, { color: c.accent }]} adjustsFontSizeToFit numberOfLines={1}>
            {`${(config?.name?.trim() || mode).toUpperCase()} MODE`}
          </Text>
          {displayImage !== undefined && <Image
            source={displayImage}
            style={{ width: modoW, height: modoW * 0.75, alignSelf: 'center' }}
            resizeMode="contain"
          />}
          <View style={[styles.panel, { backgroundColor: darken(c.gradientBottom, 0.08) }]}>
            <View style={styles.list}>
              {rows.map((r) => {
                const isChecked =
                  r.label === "YOUR ROUTE"
                    ? mapSettings.enabled
                    : r.label === 'PLAYLIST' && supportsMusic
                      ? music.enabled
                      : r.label === 'TIMER'
                        ? timerEnabled
                        : r.label === 'WEATHER'
                          ? weatherEnabled
                          : r.label === 'ALARM SET'
                            ? alarmsOn
                            : r.label === 'BLUE LIGHT FILTER' && mode === 'sleep'
                              ? blueLight.settings.enabled
                              : r.label === 'DO NOT DISTURB'
                                ? dnd.on
                                : r.label === 'SCRATCHPAD'
                                  ? scratchpadOn
                                  : r.checked;
                const canToggle =
                  (r.label === 'YOUR ROUTE') ||
                  (r.label === 'PLAYLIST' && supportsMusic) ||
                  (r.label === 'TIMER') ||
                  (r.label === 'WEATHER') ||
                  (r.label === 'ALARM SET') ||
                  (r.label === 'BLUE LIGHT FILTER' && mode === 'sleep') ||
                  r.label === 'DO NOT DISTURB' || r.label === 'SCRATCHPAD';
                const toggleDisabled =
                  (r.label === 'PLAYLIST' && (musicLoading || musicSaving)) ||
                  (r.label === 'YOUR ROUTE' && (mapLoading || mapSaving));
                return (
                  <View key={r.label}>
                    <Pressable
                      disabled={!canToggle || toggleDisabled}
                      accessibilityRole={canToggle ? 'checkbox' : undefined}
                      accessibilityState={canToggle ? { checked: isChecked, disabled: toggleDisabled } : undefined}
                      onPress={() => {
                        if (r.label === 'YOUR ROUTE') {
                          void handleToggleMaps();
                        } else if (r.label === 'TIMER') {
                          setTimerEnabled((prev) => !prev);
                        } else if (r.label === 'PLAYLIST' && supportsMusic) {
                          const nextEnabled = !music.enabled;
                          setMusic((prev) => ({ ...prev, enabled: nextEnabled }));
                          setShowMusicSettings(nextEnabled);
                          if (!nextEnabled) {
                            void (mode === 'sleep' && config
                              ? savePresetConfig(mode, { ...config, musicEnabled: false })
                              : savePresetMusic(mode as MusicPresetKey, { ...music, enabled: false })
                            ).catch((error) => {
                              console.error('Failed to disable music:', error);
                              Alert.alert('Save failed', 'Unable to save your music preference.');
                            });
                          }
                        } else if (r.label === 'WEATHER') {
                          setWeatherEnabled((prev) => !prev);
                        } else if (r.label === 'ALARM SET') {
                          setAlarmsOn((prev) => !prev);
                        } else if (r.label === 'BLUE LIGHT FILTER' && mode === 'sleep') {
                          blueLight.update({ enabled: !blueLight.settings.enabled });
                        } else if (r.label === 'SCRATCHPAD') {
                          setScratchpadOn((prev) => !prev);
                        } else if (r.label === 'DO NOT DISTURB') {
                          dnd.set(!dnd.on);
                        }
                      }}
                      style={styles.row}
                    >
                      <View
                        style={[
                          styles.box,
                          {
                            borderColor: c.accent,
                            backgroundColor: isChecked ? c.text : c.accent,
                          },
                        ]}
                      >
                        {isChecked && (
                          <Ionicons name="checkmark" size={24} color={c.accent} />
                        )}
                      </View>
                      <Text style={[styles.rowText, { color: c.text }]}>
                        {r.label}
                      </Text>
                    </Pressable>
                    {r.label === 'TIMER' && timerEnabled && (
                      <FocusTimer
                        initialDurationSeconds={config?.timerDuration ?? 120 * 60}
                        initialBreakMinutes={config?.breakMinutes ?? 0}
                        textColor={c.text}
                        accentColor={c.accent}
                      />
                    )}
                    {/* Sleep mode's alarms: each rings at its time on the phone's clock */}
                    {r.label === 'ALARM SET' && alarmsOn && (
                      <>
                        {effectiveAlarms.map((a) => (
                          <AlarmRow
                            key={a.id}
                            alarm={a}
                            modeTitle={`${config?.name ?? mode} mode`}
                            textColor={c.text}
                            accentColor={c.accent}
                            startOpen={a.id === justAddedAlarm}
                            onChange={mode === 'sleep' ? (next) =>
                              setSleepAlarms((list) => list.map((x) => (x.id === next.id ? next : x)))
                              : undefined}
                            onDelete={mode === 'sleep' ? () => setSleepAlarms((list) => list.filter((x) => x.id !== a.id)) : undefined}
                          />
                        ))}
                        {mode === 'sleep' && sleepAlarms.length < MAX_ALARMS && (
                          <Pressable
                            onPress={() => {
                              const added = newAlarm();
                              setJustAddedAlarm(added.id);
                              setSleepAlarms((list) => [...list, added]);
                            }}
                            style={({ pressed }) => [
                              styles.addAlarmButton,
                              { borderColor: c.text },
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                          >
                            <Text style={[styles.addAlarmText, { color: c.text }]}>+ ADD ALARM</Text>
                          </Pressable>
                        )}
                      </>
                    )}
                    {r.label === 'PLAYLIST' && supportsMusic ? (
                      !musicLoading && music.enabled && showMusicSettings ? (
                        <View style={styles.musicSettingsPanel}>
                          <MusicSettings
                            playlistUrl={music.playlistUrl}
                            onPlaylistChange={(url) =>
                              setMusic((prev) => ({
                                ...prev,
                                playlistUrl: url,
                              }))
                            }
                            playlistName={music.playlistName}
                            onPlaylistNameChange={(name) =>
                              setMusic((prev) => ({
                                ...prev,
                                playlistName: name,
                              }))
                            }
                            textColor={c.text}
                            accentColor={c.accent}
                          />
                          <Pressable
                            disabled={musicSaving}
                            onPress={handleSaveMusic}
                            style={[
                              styles.saveMusicButton,
                              { backgroundColor: c.accent },
                            ]}
                          >
                            <Text style={styles.saveMusicText}>
                              {musicSaving ? 'SAVING...' : 'SAVE MUSIC SETTINGS'}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null
                    ) : r.label === 'DO NOT DISTURB' ? (
                      dnd.on ? <DndCard textColor={c.text} accentColor={c.accent} inMode /> : null
                    ) : mode === 'sleep' && r.label === 'BLUE LIGHT FILTER' ? (
                      blueLight.settings.enabled ? (
                        <BlueLightCard textColor={c.text} accentColor={c.accent} />
                      ) : null
                    ) : r.label === 'WEATHER' ? (
                      weatherEnabled ? <WeatherCard /> : null
                    ) : r.label === 'YOUR ROUTE' ? (
                      mapLoading ? (
                        <Text style={{ color: c.text, padding: 12 }}>
                          Loading saved map settings...
                        </Text>
                      ) : mapSettings.enabled ? (
                        <MapCard
                          key={`${mode}-${session?.user.id ?? 'guest'}`}
                          initialSettings={mapSettings}
                          onSaveSettings={handleSaveMapSettings}
                          accentColor={c.accent}
                        />
                      ) : null
                    ) : r.label === 'SCRATCHPAD' ? (
                      scratchpadOn ? <Scratchpad modeId={mode} /> : null
                    ) : r.box ? (
                      <View
                        style={[
                          styles.placeholderBox,
                          { backgroundColor: c.accent },
                        ]}
                      />
                    ) : null
                    }
                    {r.label === 'PLAYLIST' && supportsMusic &&
                      !musicLoading &&
                      music.enabled &&
                      normalizeSpotifyPlaylist(music.playlistUrl) && (
                        <Pressable
                          onPress={async () => {
                            try {
                              await openSpotifyPlaylist(music.playlistUrl);
                            } catch {
                              Alert.alert(
                                'Spotify error',
                                'Unable to open your playlist.',
                              );
                            }
                          }}
                          style={({ pressed }) => [
                            styles.spotifyButton,
                            { marginTop: 12 },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Ionicons
                            name="musical-notes"
                            size={30}
                            color="#FFFFFF"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.spotifyButtonText}>
                              OPEN SPOTIFY
                            </Text>
                            <Text
                              style={styles.spotifyPlaylistName}
                              numberOfLines={2}
                            >
                              {music.playlistName.trim() || 'YOUR PLAYLIST'}
                            </Text>
                          </View>
                          <Ionicons
                            name="open-outline"
                            size={24}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      )}
                  </View>
                );
              })}
            </View>
            {preset.timeNote && <Text style={[styles.timeNote, { color: c.text }]}>{preset.timeNote}</Text>}
            {/* more space above the buttons when there's no time text (Commute) */}
            <View style={[styles.buttons, { marginTop: preset.time ? 20 : 44 }]}>
              <Pressable
                style={({ pressed }) => [styles.button, { backgroundColor: c.accent }, pressed && styles.pressed]}
                onPress={() =>
                  onChangeSettings?.({
                    timerEnabled,
                    ...(supportsMusic && {
                      musicEnabled: music.enabled,
                      playlistUrl: music.playlistUrl.trim() || null,
                      playlistName: music.playlistName.trim() || null,
                    }),
                    weatherEnabled,
                    scratchpadEnabled: scratchpadOn,
                    alarmEnabled: alarmsOn && effectiveAlarms.length > 0,
                    alarms: alarmsOn ? effectiveAlarms : [],
                    dndEnabled: dnd.on,
                    ...({
                      mapEnabled: mapSettings.enabled,
                      mapDestination: mapSettings.destination,
                      mapTravelMode: mapSettings.travelMode,
                    }),
                  })
                }
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={[
                    styles.buttonText,
                    {
                      color: c.text,
                      fontSize: responsiveButtonFont,
                    },
                  ]}
                >
                  CHANGE SETTINGS
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.button, { backgroundColor: c.accent }, pressed && styles.pressed]}
                onPress={() => {
                  void dndOffForMode();
                  endModeSession(); // saves when the mode ended, for stats
                  onEnd?.();
                }}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={[
                    styles.buttonText,
                    {
                      color: c.text,
                      fontSize: responsiveButtonFont,
                    },
                  ]}
                >
                  END MODE
                </Text>
              </Pressable>
            </View>
          </View>
        </LockableScrollView>
      </LinearGradient>
    </KeyboardAvoidingView >
  );
}
const styles = StyleSheet.create({
  addAlarmButton: {
    alignSelf: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  addAlarmText: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
  scroll: { paddingHorizontal: 12 },
  title: {
    fontSize: 50,
    lineHeight: 60,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginBottom: 8,
  },
  panel: {
    marginTop: 16,
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 16,
    ...shadows.inset,
  },
  list: { rowGap: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  box: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 25,
    lineHeight: 32,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.5,
    marginLeft: 14,
  },
  placeholderBox: {
    height: 56,
    borderRadius: 18,
    marginTop: 10,
    marginLeft: 46, // lines up with the label (box 32 + gap 14)
    opacity: 0.8,
  },
  time: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginTop: 20,
  },
  timeNote: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  buttons: { alignItems: 'center', rowGap: 12 },
  button: {
    alignSelf: 'center',
    maxWidth: '100%',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },
  buttonText: {
    fontSize: 28,
    lineHeight: 38,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  musicSettingsPanel: {
    marginTop: 20,
    gap: 16,
  },
  saveMusicButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  saveMusicText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  spotifyButton: {
    backgroundColor: '#168344',
    width: '100%',
    minHeight: 100,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: '#0D6532',
    ...shadows.raised,
  },
  spotifyButtonText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontFamily: fonts.headingBold,
  },
  spotifyPlaylistName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.headingBold,
    marginTop: 4,
  },
});
