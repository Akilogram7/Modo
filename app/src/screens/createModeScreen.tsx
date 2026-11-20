import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, shadows, backgroundColors, gradientStops, gradientDirection } from '../../assets/theme';
import { TimerSettings } from '../features/timer';
import type { CustomModeInput } from '../types/mode';
import { MusicSettings } from '../features/music';
import { AlarmListEditor, newAlarm, type ModeAlarm } from '../features/alarm';
import { LockableScrollView } from '../components/ScrollLock';
import { MapCard } from '../features/maps/MapCard';
import {
  EMPTY_MAP_SETTINGS,
  type SavedMapSettings,
} from '../features/maps/mapTypes';
export const CHARACTERS = [
  require('../../assets/Modos/ModoWave.png'),
  require('../../assets/Modos/ModoWink.png'),
  require('../../assets/Modos/ModoExcited.png'),
  require('../../assets/Modos/ModoPeep.png'),
  require('../../assets/Modos/ModoDrink.png'),
  require('../../assets/Modos/ModoHeart.png'),
  require('../../assets/Modos/ModoFlower.png'),
  require('../../assets/Modos/ModoQuestion.png'),
  require('../../assets/Modos/ModoRun.png'),
  require('../../assets/Modos/ModoStudy.png'),
  require('../../assets/Modos/ModoSad.png'),
  require('../../assets/Modos/ModoSleep.png'),
  require('../../assets/Modos/ModoLazy.png'),
  require('../../assets/Modos/ModoMusic.png'),
  require('../../assets/Modos/ModoYippee.png'),
];
const COLUMNS = 5;

// Every feature the search bar can add. `words` are extra search terms,
// so typing "spotify" finds Music and "notes" finds Scratchpad.
type FeatureKey = 'timer' | 'alarm' | 'music' | 'weather' | 'maps' | 'scratchpad';
const FEATURES: { key: FeatureKey; label: string; words: string }[] = [
  { key: 'timer', label: 'FOCUS TIMER', words: 'timer focus pomodoro study break' },
  { key: 'alarm', label: 'ALARM', words: 'alarm wake up clock' },
  { key: 'music', label: 'MUSIC', words: 'music spotify playlist songs' },
  { key: 'weather', label: 'WEATHER', words: 'weather forecast rain temperature' },
  { key: 'maps', label: 'MAPS', words: 'maps route directions drive walk commute' },
  { key: 'scratchpad', label: 'SCRATCHPAD', words: 'scratchpad notes write' },
];

// blends a colour toward white, used for the light end of the gradient
function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}
// blends a colour toward black, used for the text and buttons
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}
// true if the colour is dark, so we know to use light text on it
function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 90;
}
// one Modo in the panel: glows and wiggles when selected
function CharacterOption({
  source,
  size,
  selected,
  onPress,
}: {
  source: number;
  size: number;
  selected: boolean;
  onPress: () => void;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(glow, { toValue: selected ? 1 : 0, duration: 250, useNativeDriver: true }).start();
    if (selected) {
      const t = { duration: 90, useNativeDriver: true };
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, ...t }),
        Animated.timing(wiggle, { toValue: -1, ...t }),
        Animated.timing(wiggle, { toValue: 1, ...t }),
        Animated.timing(wiggle, { toValue: -1, ...t }),
        Animated.timing(wiggle, { toValue: 0, ...t }),
      ]).start();
    }
  }, [selected]);
  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] });
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* the glow: a white, blurred copy of the same image behind the Modo */}
      <Animated.Image
        source={source}
        resizeMode="contain"
        blurRadius={12}
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 0.95,
          height: size * 0.95,
          tintColor: '#fff',
          opacity: glow,
          transform: [{ rotate }, { scale: 1.12 }],
        }}
      />
      <Animated.Image
        source={source}
        resizeMode="contain"
        style={{ width: size * 0.95, height: size * 0.95, transform: [{ rotate }] }}
      />
    </Pressable>
  );
}
type Props = {
  onBack?: () => void;
  onCreate?: (mode: CustomModeInput) => void;
  // pass in an existing mode to edit it instead of making a new one
  initialMode?: CustomModeInput | null;
};
export default function CreateModeScreen({ onBack, onCreate, initialMode }: Props) {
  const editing = !!initialMode;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const GAP = 12;
  const swatchW = (width - 48 - 28 - GAP * 3) / 4; // screen minus side padding, panel padding, and gaps*
  const charSize = (width - 48 - 20) / COLUMNS; // screen minus side padding and panel padding*
  const [name, setName] = useState(initialMode?.name ?? '');
  const [color, setColor] = useState(initialMode?.color ?? backgroundColors[0]);
  const [character, setCharacter] = useState<number | null>(initialMode?.character ?? null);
  //timer&#x20;
  const [timerEnabled, setTimerEnabled] = useState<boolean>(initialMode?.timerEnabled ?? false);
  const [timerMinutes, setTimerMinutes] = useState<number>(
    initialMode?.timerDuration ? Math.round(initialMode.timerDuration / 60) : 25,
  );
  const [breakMinutes, setBreakMinutes] = useState<number>(initialMode?.breakMinutes ?? 0);
  //alarm
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(initialMode?.alarmEnabled ?? false);
  const [alarms, setAlarms] = useState<ModeAlarm[]>(initialMode?.alarms ?? []);
  //music
  const [playlistUrl, setPlaylistUrl] = useState(initialMode?.playlistUrl ?? '');
  const [musicEnabled, setMusicEnabled] = useState(initialMode?.musicEnabled ?? false);
  const [playlistName, setPlaylistName] = useState(initialMode?.playlistName ?? '');
  const [weatherEnabled, setWeatherEnabled] = useState(
    initialMode?.weatherEnabled ?? false
  );
  // Maps
  const [mapSettings, setMapSettings] = useState<SavedMapSettings>({
    enabled: initialMode?.mapEnabled ?? false,
    destination: initialMode?.mapDestination ?? null,
    travelMode: initialMode?.mapTravelMode ?? 'driving',
  });

  // Scratchpad
  const [scratchpadEnabled, setScratchpadEnabled] = useState(
    initialMode?.scratchpadEnabled ?? false
  );

// Feature search
const [query, setQuery] = useState('');

// A mode needs at least one feature, or there's nothing for it to do
const hasFeature =
  timerEnabled ||
  musicEnabled ||
  weatherEnabled ||
  (alarmEnabled && alarms.length > 0) ||
  mapSettings.enabled ||
  scratchpadEnabled;

  // text and buttons follow the chosen background colour
  const dark = isDark(color);
  const textColor = dark ? '#FFFFFF' : darken(color, 0.45);
  const buttonColor = dark ? lighten(color, 0.25) : darken(color, 0.3);

  // ─── feature helpers ───
  const isEnabled = (key: FeatureKey): boolean => {
    switch (key) {
      case 'timer': return timerEnabled;
      case 'alarm': return alarmEnabled;
      case 'music': return musicEnabled;
      case 'weather': return weatherEnabled;
      case 'maps': return mapSettings.enabled;
      case 'scratchpad': return scratchpadEnabled;
    }
  };

  const setEnabled = (key: FeatureKey, on: boolean) => {
    switch (key) {
      case 'timer':
        setTimerEnabled(on);
        break;
      case 'alarm':
        setAlarmEnabled(on);
        // Turning alarms on starts you with one
        if (on && alarms.length === 0) setAlarms([newAlarm()]);
        break;
      case 'music':
        setMusicEnabled(on);
        break;
      case 'weather':
        setWeatherEnabled(on);
        break;
      case 'maps':
        setMapSettings((prev) => ({ ...prev, enabled: on }));
        break;
      case 'scratchpad':
        setScratchpadEnabled(on);
        break;
    }
  };

  // the settings that open under each feature once it's on
  const renderSettings = (key: FeatureKey): ReactNode => {
    switch (key) {
      case 'timer':
        return (
          <TimerSettings
            durationMinutes={timerMinutes}
            onDurationChange={setTimerMinutes}
            breakMinutes={breakMinutes}
            onBreakChange={setBreakMinutes}
            textColor={textColor}
            accentColor={buttonColor}
          />
        );
      case 'alarm':
        return (
          <AlarmListEditor
            alarms={alarms}
            onChange={setAlarms}
            textColor={textColor}
            accentColor={buttonColor}
          />
        );
      case 'music':
        return (
          <MusicSettings
            playlistUrl={playlistUrl}
            onPlaylistChange={setPlaylistUrl}
            textColor={textColor}
            accentColor={buttonColor}
            playlistName={playlistName}
            onPlaylistNameChange={setPlaylistName}
          />
        );
      case 'maps':
        return (
          <MapCard
            key={initialMode?.mapDestination?.label ?? 'new-map'}
            initialSettings={mapSettings}
            onSaveSettings={async (settings) => {
              setMapSettings({
                ...settings,
                enabled: true,
              });
            }}
          />
        );
      // weather and scratchpad have no settings here
      default:
        return null;
    }
  };

const q = query.trim().toLowerCase();

const filteredFeatures = FEATURES.filter(
  (feature) =>
    feature.label.toLowerCase().includes(q) ||
    feature.words.toLowerCase().includes(q)
);

  return (
    <LinearGradient
      colors={[lighten(color, 0.46), color]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={{ flex: 1 }}
    >
      <LockableScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: textColor }]}>{editing ? 'EDIT MODE' : 'CREATE MODE'}</Text>
        <Text style={[styles.label, { color: textColor }]}>EDIT NAME</Text>
        <TextInput
          style={[styles.panel, styles.input, { color: textColor }]}
          value={name}
          onChangeText={setName}
          maxLength={20}
        />
        <Text style={[styles.label, { color: textColor }]}>CUSTOMIZE</Text>
        <View style={[styles.panel, styles.swatchPanel]}>
          {backgroundColors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                { width: swatchW, height: swatchW * 0.85, borderRadius: 18, backgroundColor: c },
                c === color && styles.swatchOn,
              ]}
            />
          ))}
        </View>
        {/* Character panel */}
        <View style={[styles.panel, styles.charPanel]}>
          {CHARACTERS.map((src, i) => (
            <CharacterOption
              key={i}
              source={src}
              size={charSize}
              selected={character === i}
              onPress={() => setCharacter(i)}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: textColor }]}>
          FEATURES
        </Text>

        {/* search bar */}
        <View style={[styles.panel, styles.searchBar]}>
          <Ionicons
            name="search"
            size={22}
            color={textColor}
          />

          <TextInput
            style={[
              styles.searchInput,
              { color: textColor },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search features..."
            placeholderTextColor={
              dark
                ? 'rgba(255,255,255,0.6)'
                : 'rgba(0,0,0,0.4)'
            }
            autoCapitalize="none"
            autoCorrect={false}
          />

          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={22}
                color={textColor}
              />
            </Pressable>
          )}
        </View>

        {/* ONE PERMANENT FEATURE LIST */}
        <View style={[styles.panel, styles.featureList]}>
          {filteredFeatures.map((feature, index) => {
            const enabled = isEnabled(feature.key);

            return (
              <View key={feature.key}>
                <View style={styles.featureHeader}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: textColor },
                    ]}
                  >
                    {feature.label}
                  </Text>

                  <Switch
                    value={enabled}
                    onValueChange={(on) =>
                      setEnabled(feature.key, on)
                    }
                    trackColor={{
                      false: '#999999',
                      true: buttonColor,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {enabled && (
                  <View style={styles.featureSettings}>
                    {renderSettings(feature.key)}
                  </View>
                )}

                {index < filteredFeatures.length - 1 && (
                  <View style={styles.featureDivider} />
                )}
              </View>
            );
          })}

          {filteredFeatures.length === 0 && (
            <Text
              style={[
                styles.hint,
                { color: textColor },
              ]}
            >
              No matching features.
            </Text>
          )}
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: buttonColor }, pressed && styles.pressed]}
            onPress={onBack}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: buttonColor }, pressed && styles.pressed]}
            onPress={() => {
              if (!name.trim()) {
                Alert.alert('Give your mode a name', 'Type a name at the top so you can find it later.');
                return;
              }
              if (!hasFeature) {
                Alert.alert(
                  'Pick at least one feature',
                  'Turn on a timer, music, weather, an alarm, a map or the scratchpad so your mode has something to do.',
                );
                return;
              }
              onCreate?.({
                name: name.trim(),
                color,
                // No icon picked: choose a random one
                character: character ?? Math.floor(Math.random() * CHARACTERS.length),
                timerEnabled,
                timerDuration: timerEnabled ? timerMinutes * 60 : null,
                breakMinutes: timerEnabled ? breakMinutes : 0,
                musicEnabled,
                playlistUrl: musicEnabled ? playlistUrl.trim() : null,
                playlistName: musicEnabled ? playlistName.trim() : null,
                weatherEnabled,
                alarmEnabled: alarmEnabled && alarms.length > 0,
                alarms: alarmEnabled ? alarms : [],
                // Maps
                mapEnabled: mapSettings.enabled,
                mapDestination: mapSettings.destination,
                mapTravelMode: mapSettings.travelMode,
                scratchpadEnabled,
              });
            }}
          >
            <Text style={styles.buttonText}>{editing ? 'Save Changes' : 'Create Mode'}</Text>
          </Pressable>
        </View>
      </LockableScrollView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 38, fontFamily: fonts.headingBold, textAlign: 'center', marginBottom: 16 },
  label: { fontSize: 20, fontFamily: fonts.headingBold, marginTop: 8, marginBottom: 6, marginLeft: 8 },
  panel: { backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 28, ...shadows.raised },
  input: { height: 54, paddingHorizontal: 20, fontSize: 18, fontFamily: fonts.headingBold },
  swatchPanel: { padding: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  swatchOn: { transform: [{ scale: 1.1 }] },
  charPanel: { marginTop: 16, padding: 10, flexDirection: 'row', flexWrap: 'wrap' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 18,
    gap: 10,
  },
  searchInput: { flex: 1, height: '100%', fontSize: 18, fontFamily: fonts.headingBold },
  results: { marginTop: 12, gap: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  added: { marginTop: 16, gap: 16 },
  hint: { fontSize: 16, fontFamily: fonts.headingBold, textAlign: 'center', marginTop: 12, opacity: 0.8 },
  features: {
    padding: 20,
    gap: 16,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureTitle: {
    fontSize: 20,
    fontFamily: fonts.headingBold,
  },
  buttons: { alignItems: 'center', marginTop: 24, rowGap: 10 },
  button: { borderRadius: 30, paddingVertical: 12, paddingHorizontal: 40, ...shadows.raised },
  buttonText: { color: '#fff', fontSize: 24, fontFamily: fonts.headingBold },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },

  featureList: {
    marginTop: 16,
    padding: 20,
    gap: 12,
  },

  featureSettings: {
    marginTop: 12,
  },

  featureDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginVertical: 16,
  },
});