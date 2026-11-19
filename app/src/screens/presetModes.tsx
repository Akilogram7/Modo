import {
  Alert,
  Image,
  Pressable,
  ScrollView,
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
import { MusicSettings } from '../features/music';
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
// ─────────────── PRESET MODE COLOURS ───────────────*
// gradientTop = light end, gradientBottom = main colour,*
// accent = page title, checkboxes and buttons, text = labels, times and button text.*
// (kept here so theme.ts doesn't change; can be moved into theme.ts later)*
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
// same linear gradient on every mode page (from Figma: stops at 36% and 48%)*
const GRADIENT_STOPS = [0.36, 0.48] as const;
const GRADIENT_START = { x: 1, y: 0 };
const GRADIENT_END = { x: 0.22, y: 0.735 };
type Row = {
  label: string;
  checked: boolean;
  box?: boolean; // shows an empty box under the row (Commute: your route, weather)*
};
type Preset = {
  title: string;
  image: number;
  rows: Row[];
  time?: string; // big text under the rows*
  timeNote?: string; // small text under the big text*
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
      { label: 'ALARM SET', checked: true },
    ],
    time: '8:00 AM',
    timeNote: '7 hours and 32 minutes',
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
// blends a colour toward black (used for the panel behind the rows)*
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
type Props = {
  mode: PresetKey;
  onChangeSettings?: () => void;
  onEnd?: () => void;
};
export default function PresetModeScreen({ mode, onChangeSettings, onEnd }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const preset = PRESETS[mode];
  const c = presetModeColors[mode];
  const modoW = Math.min(width * 0.6, 260);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  //Supabase auth session (used to load/save preset music)*
  const { session } = useAuth();
  const supportsMusic = mode === 'study' || mode === 'commute';
  const [music, setMusic] = useState<PresetMusic>({
    ...EMPTY_PRESET_MUSIC,
  });
  const [musicLoading, setMusicLoading] = useState(true);
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
    loadPresetMusic(mode as MusicPresetKey)
      .then((settings) => {
        if (!cancelled) {
          setMusic(settings);
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
  }, [mode, session?.user.id, supportsMusic]);

  useEffect(() => {
    let cancelled = false;

    setMapSettings({ ...EMPTY_MAP_SETTINGS });
    setMapLoading(true);

    if (mode !== 'commute' || !session?.user.id) {
      setMapLoading(false);
      return;
    }

    loadPresetMaps('commute')
      .then((settings) => {
        if (!cancelled) {
          setMapSettings(settings);
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
  }, [mode, session?.user.id]);

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
      await savePresetMusic(mode as MusicPresetKey, music);
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
    await savePresetMaps('commute', settings);
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
      await savePresetMaps('commute', nextSettings);
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
        <ScrollView
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
            {preset.title}
          </Text>
          <Image
            source={preset.image}
            style={{ width: modoW, height: modoW * 0.75, alignSelf: 'center' }}
            resizeMode="contain"
          />
          <View style={[styles.panel, { backgroundColor: darken(c.gradientBottom, 0.08) }]}>
            <View style={styles.list}>
              {preset.rows.map((r) => {
                const isChecked =
                  r.label === "YOUR ROUTE" && mode === 'commute'
                    ? mapSettings.enabled
                    : r.label === 'PLAYLIST' && supportsMusic
                      ? music.enabled
                      : r.label === 'TIMER' && mode === 'study'
                        ? timerEnabled
                        : r.label === 'WEATHER' && mode === 'commute'
                          ? weatherEnabled
                          : r.checked;
                const canToggle =
                  (r.label === 'YOUR ROUTE' && mode === 'commute') ||
                  (r.label === 'PLAYLIST' && supportsMusic) ||
                  (r.label === 'TIMER' && mode === 'study') ||
                  (r.label === 'WEATHER' && mode === 'commute');
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
                        if (r.label === 'YOUR ROUTE' && mode === 'commute') {
                          void handleToggleMaps();
                        } else if (r.label === 'TIMER' && mode === 'study') {
                          setTimerEnabled((prev) => !prev);
                        } else if (r.label === 'PLAYLIST' && supportsMusic) {
                          const nextEnabled = !music.enabled;
                          setMusic((prev) => ({ ...prev, enabled: nextEnabled }));
                          setShowMusicSettings(nextEnabled);

                          if (!nextEnabled) {
                            void savePresetMusic(mode as MusicPresetKey, {
                              ...music,
                              enabled: false,
                            }).catch((error) => {
                              console.error('Failed to disable music:', error);
                              Alert.alert('Save failed', 'Unable to save your music preference.');
                            });
                          }
                        } else if (r.label === 'WEATHER' && mode === 'commute') {
                          setWeatherEnabled((prev) => !prev);
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
                    {mode === 'commute' && r.label === 'WEATHER' ? (
                      weatherEnabled ? <WeatherCard /> : null
                    ) : mode === 'commute' && r.label === 'YOUR ROUTE' ? (
                      mapLoading ? (
                        <Text style={{ color: c.text, padding: 12 }}>
                          Loading saved map settings...
                        </Text>
                      ) : mapSettings.enabled ? (
                        <MapCard
                          key={`${mode}-${session?.user.id ?? 'guest'}`}
                          initialSettings={mapSettings}
                          onSaveSettings={handleSaveMapSettings}
                        />
                      ) : null
                    ) : r.box ? (
                      <View
                        style={[
                          styles.placeholderBox,
                          { backgroundColor: c.accent },
                        ]}
                      />
                    ) : null}
            </View>
            );
              })}
          </View>
          {/* Reuse the same timer in Study Mode and custom modes. */}
          {mode === 'study' && timerEnabled && (
            <FocusTimer
              initialDurationSeconds={120 * 60}
              textColor={c.text}
              accentColor={c.accent}
            />
          )}
          {supportsMusic && !musicLoading && music.enabled && showMusicSettings && (
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
          )}
          {preset.timeNote && <Text style={[styles.timeNote, { color: c.text }]}>{preset.timeNote}</Text>}
          {/* more space above the buttons when there's no time text (Commute) */}
          <View style={[styles.buttons, { marginTop: preset.time ? 20 : 44 }]}>
            {supportsMusic &&
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
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: c.accent }, pressed && styles.pressed]}
              onPress={onChangeSettings}
            >
              <Text style={[styles.buttonText, { color: c.text }]}>CHANGE SETTINGS</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: c.accent }, pressed && styles.pressed]}
              onPress={() => {
                endModeSession(); // saves when the mode ended, for stats*
                onEnd?.();
              }}
            >
              <Text style={[styles.buttonText, { color: c.text }]}>END MODE</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
    </KeyboardAvoidingView >
  );
}
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24 },
  title: {
    fontSize: 50,
    lineHeight: 60,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginBottom: 8,
  },
  panel: {
    marginTop: 16,
    borderRadius: 30,
    paddingVertical: 24,
    paddingHorizontal: 20,
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
    marginLeft: 46, // lines up with the label (box 32 + gap 14)*
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
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 24,
    ...shadows.raised,
  },
  buttonText: {
    fontSize: 30,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.5,
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
