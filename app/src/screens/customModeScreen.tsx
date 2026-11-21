import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, shadows } from '../../assets/theme';
import { CHARACTERS } from './createModeScreen';
import { FocusTimer, FollowTimer, type TimerState } from '../features/timer';
import type { CustomMode } from '../types/mode';
import type { SharedTimer } from '../services/modeGroups';
import { AlarmRow } from '../features/alarm';
import { LockableScrollView } from '../components/ScrollLock';
import { endModeSession } from '../stats/modeSessions';
import { MusicSettings } from '../features/music';
import { openSpotifyPlaylist } from '../features/music';
import { WeatherCard } from '../features/weather/WeatherCard';
import { MapCard } from '../features/maps/MapCard';
import Scratchpad from '../features/scratchpad/Scratchpad';
import { useEffect, useState } from 'react';

type Props = {
  mode: CustomMode;
  onEnd: () => void;
  // Set when this is a friend's shared mode: only the host can change it, so the screen is read-only
  hostName?: string;
  sharedTimer?: SharedTimer | null;
  // Set when this is YOUR shared mode: tells friends what your timer is doing
  onTimerChange?: (state: TimerState) => void;
  // Opens the edit screen for this mode (not shown to friends following someone else's mode)
  onChangeSettings?: () => void;
};

function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (value: number) => Math.round(value + (255 - value) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (value: number) => Math.round(value * (1 - amount));
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

export default function CustomModeScreen({
  mode,
  onEnd,
  hostName,
  sharedTimer = null,
  onTimerChange,
  onChangeSettings,
}: Props) {
  const following = hostName !== undefined;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const characterImage = mode.character !== null ? CHARACTERS[mode.character] : undefined;
  const accent = darken(mode.color, 0.4);
  const textColor = '#FFFFFF';
  const modoW = Math.min(width * 0.6, 260);
  const [timerEnabled, setTimerEnabled] = useState(mode.timerEnabled);
  const [weatherEnabled, setWeatherEnabled] = useState(mode.weatherEnabled);
  const [musicEnabled, setMusicEnabled] = useState(mode.musicEnabled);
  const modeTitle = `${mode.name.trim() || 'Custom'} mode`;
  // The alarms are on while this mode is on. Changes made here only last until the mode ends.
  const [alarmsOn, setAlarmsOn] = useState(mode.alarmEnabled);
  const [mapEnabled, setMapEnabled] = useState(mode.mapEnabled);
  const [scratchpadEnabled, setScratchpadEnabled] = useState(mode.scratchpadEnabled ?? false);

  const finish = () => {
    void endModeSession();
    onEnd();
  };

  useEffect(() => {
    setTimerEnabled(mode.timerEnabled);
    setWeatherEnabled(mode.weatherEnabled);
    setMusicEnabled(mode.musicEnabled);
    setMapEnabled(mode.mapEnabled);
    setScratchpadEnabled(mode.scratchpadEnabled ?? false);
  }, [
    mode.id,
    mode.timerEnabled,
    mode.weatherEnabled,
    mode.musicEnabled,
    mode.mapEnabled,
    mode.scratchpadEnabled,
  ]);

  return (
    <LinearGradient
      colors={[lighten(mode.color, 0.46), mode.color]}
      locations={[0.36, 0.48]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.22, y: 0.735 }}
      style={{ flex: 1 }}
    >
      <LockableScrollView
        nestedScrollEnabled
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 160,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >

        <Text style={[styles.title, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {(mode.name || 'CUSTOM').toUpperCase()} MODE
        </Text>
        {characterImage !== undefined && (
          <Image source={characterImage} style={{ width: modoW, height: modoW * 0.75, alignSelf: 'center' }} resizeMode="contain" />
        )}

        {/* Friends in a shared mode: the host is in charge */}
        {following && (
          <View style={[styles.hostBanner, { backgroundColor: accent }]}>
            <Ionicons name="people" size={20} color={textColor} />
            <Text style={[styles.hostBannerText, { color: textColor }]}>
              {hostName} is running this mode. Only they can change it.
            </Text>
          </View>
        )}

        <View
          style={[
            styles.panel,
            { backgroundColor: darken(mode.color, 0.08) },
          ]}
        >
          {/* TIMER — only available if enabled when creating the mode */}
          {mode.timerEnabled && (
            <>
              <Pressable
                style={styles.row}
                onPress={() => setTimerEnabled((prev) => !prev)}
                disabled={following}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: timerEnabled, disabled: following }}
              >
                <View
                  style={[
                    styles.box,
                    {
                      backgroundColor: timerEnabled ? '#FFFFFF' : accent,
                      borderColor: accent,
                    },
                  ]}
                >
                  {timerEnabled && (
                    <Ionicons name="checkmark" size={24} color={accent} />
                  )}
                </View>

                <Text style={[styles.rowText, { color: textColor }]}>
                  TIMER
                </Text>
              </Pressable>

              {timerEnabled && mode.timerDuration !== null && (
                following ? (
                  <FollowTimer
                    timer={sharedTimer}
                    fallbackSeconds={mode.timerDuration}
                    fallbackBreakSeconds={(mode.breakMinutes ?? 0) * 60}
                    hostName={hostName}
                    textColor={textColor}
                    accentColor={accent}
                  />
                ) : (
                  <FocusTimer
                    initialDurationSeconds={mode.timerDuration}
                    initialBreakMinutes={mode.breakMinutes ?? 0}
                    textColor={textColor}
                    accentColor={accent}
                    onStateChange={onTimerChange}
                  />
                )
              )}
            </>
          )}

          {/* ALARM — only available if enabled when creating the mode */}
          {mode.alarmEnabled && (
            <>
              <Pressable
                style={[styles.row, { marginTop: 20 }]}
                onPress={() => setAlarmsOn((prev) => !prev)}
                disabled={following}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: alarmsOn, disabled: following }}
              >
                <View
                  style={[
                    styles.box,
                    {
                      backgroundColor: alarmsOn ? '#FFFFFF' : accent,
                      borderColor: accent,
                    },
                  ]}
                >
                  {alarmsOn && (
                    <Ionicons name="checkmark" size={24} color={accent} />
                  )}
                </View>

                <Text style={[styles.rowText, { color: textColor }]}>
                  {mode.alarms.length > 1 ? 'ALARMS' : 'ALARM'}
                </Text>
              </Pressable>

              {alarmsOn &&
                mode.alarms.map((a) => (
                  <AlarmRow
                    key={a.id}
                    alarm={a}
                    modeTitle={modeTitle}
                    textColor={textColor}
                    accentColor={accent}
                    readOnly={following}
                  />
                ))}
            </>
          )}

          {/* WEATHER — only available if enabled when creating the mode */}
          {mode.weatherEnabled && (
            <>
              <Pressable
                style={[styles.row, { marginTop: 20 }]}
                onPress={() => setWeatherEnabled((prev) => !prev)}
                disabled={following}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: weatherEnabled, disabled: following }}
              >
                <View
                  style={[
                    styles.box,
                    {
                      backgroundColor: weatherEnabled ? '#FFFFFF' : accent,
                      borderColor: accent,
                    },
                  ]}
                >
                  {weatherEnabled && (
                    <Ionicons name="checkmark" size={24} color={accent} />
                  )}
                </View>

                <Text style={[styles.rowText, { color: textColor }]}>
                  WEATHER
                </Text>
              </Pressable>

              {weatherEnabled && <WeatherCard />}
            </>
          )}

          {/* Only show this when the mode has no saved features */}
          {/* Only show this when the mode has no saved features */}
          {!mode.timerEnabled &&
            !mode.musicEnabled &&
            !mode.weatherEnabled &&
            !mode.alarmEnabled &&
            !mode.mapEnabled &&
            !mode.scratchpadEnabled && (
              <Text style={[styles.note, { color: textColor }]}>
                No features are enabled yet.
              </Text>
            )}

          {/* MUSIC — only available if enabled when creating the mode */}
          {mode.musicEnabled && (
            <Pressable
              style={[styles.row, { marginTop: 20 }]}
              onPress={() => setMusicEnabled((prev) => !prev)}
              disabled={following}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: musicEnabled, disabled: following }}
            >
              <View
                style={[
                  styles.box,
                  {
                    backgroundColor: musicEnabled ? '#FFFFFF' : accent,
                    borderColor: accent,
                  },
                ]}
              >
                {musicEnabled && (
                  <Ionicons name="checkmark" size={24} color={accent} />
                )}
              </View>

              <Text style={[styles.rowText, { color: textColor }]}>
                MUSIC
              </Text>
            </Pressable>
          )}

          {/* Spotify button — only visible when Music is checked */}
          {mode.musicEnabled && musicEnabled && mode.playlistUrl && (
            <Pressable
              onPress={async () => {
                try {
                  await openSpotifyPlaylist(mode.playlistUrl!);
                } catch {
                  Alert.alert(
                    'Unable to open Spotify',
                    'Please check your playlist link.',
                  );
                }
              }}
              style={({ pressed }) => [
                styles.spotifyButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.spotifyIcon}>♫</Text>

              <Text style={styles.spotifyButtonText} numberOfLines={2}>
                OPEN SPOTIFY
                {'\n'}
                {mode.playlistName?.trim() || 'YOUR PLAYLIST'}
              </Text>
            </Pressable>
          )}

          {/* MAPS — only available if enabled when creating the mode */}
          {mode.mapEnabled && (
            <>
              <Pressable
                style={[styles.row, { marginTop: 20 }]}
                onPress={() => setMapEnabled((prev) => !prev)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: mapEnabled, disabled: following }}
                disabled={following}
              >
                <View
                  style={[
                    styles.box,
                    {
                      backgroundColor: mapEnabled ? '#FFFFFF' : accent,
                      borderColor: accent,
                    },
                  ]}
                >
                  {mapEnabled && (
                    <Ionicons name="checkmark" size={24} color={accent} />
                  )}
                </View>

                <Text style={[styles.rowText, { color: textColor }]}>
                  MAPS
                </Text>
              </Pressable>

              {mapEnabled && (
                <View style={{ marginTop: 16 }}>
                  <MapCard
                    key={mode.id}
                    initialSettings={{
                      enabled: true,
                      destination: mode.mapDestination,
                      travelMode: mode.mapTravelMode,
                    }}
                  />
                </View>
              )}
            </>
          )}


          {/* SCRATCHPAD — only available if enabled when creating the mode */}
          {mode.scratchpadEnabled && (
            <>
              <Pressable
                style={[styles.row, { marginTop: 20 }]}
                onPress={() => setScratchpadEnabled((prev) => !prev)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: scratchpadEnabled, disabled: following }}
                disabled={following}
              >
                <View
                  style={[
                    styles.box,
                    {
                      backgroundColor: scratchpadEnabled ? '#FFFFFF' : accent,
                      borderColor: accent,
                    },
                  ]}
                >
                  {scratchpadEnabled && (
                    <Ionicons name="checkmark" size={24} color={accent} />
                  )}
                </View>
                <Text style={[styles.rowText, { color: textColor }]}>SCRATCHPAD</Text>
              </Pressable>
              {scratchpadEnabled && <Scratchpad modeId={mode.id} />}
            </>
          )}

          {/* edit this mode (only the owner can) */}
          {onChangeSettings && !following && (
            <Pressable
              style={[styles.button, { backgroundColor: accent }]}
              onPress={onChangeSettings}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: textColor }]}>CHANGE SETTINGS</Text>
            </Pressable>
          )}

          {/* end mode button */}
          <Pressable style={[styles.button, { backgroundColor: accent }]} onPress={finish}>
            {/* Friends only leave. Ending it for everyone is up to the host. */}
            <Text style={[styles.buttonText, { color: textColor }]}>
              {following ? 'LEAVE MODE' : 'END MODE'}
            </Text>
          </Pressable>
        </View>
      </LockableScrollView>
    </LinearGradient>

  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24 },
  title: { fontSize: 44, lineHeight: 56, fontFamily: fonts.headingBold, textAlign: 'center', marginBottom: 8 },
  panel: { marginTop: 16, borderRadius: 30, paddingVertical: 24, paddingHorizontal: 20, ...shadows.inset },
  row: { flexDirection: 'row', alignItems: 'center' },
  box: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontSize: 25, lineHeight: 32, fontFamily: fonts.headingBold, marginLeft: 14 },
  note: { fontSize: 16, marginTop: 20, fontFamily: fonts.bodyBold },
  hostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  hostBannerText: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: fonts.bodyBold },
  button: { alignSelf: 'center', marginTop: 30, borderRadius: 30, paddingVertical: 8, paddingHorizontal: 24, ...shadows.raised },
  buttonText: { fontSize: 30, lineHeight: 50, fontFamily: fonts.headingBold },
  spotifyButton: {
    backgroundColor: '#168344',
    borderRadius: 22,
    minHeight: 100,
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    borderColor: '#0D6532',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  spotifyIcon: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  spotifyButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
  },
});
