import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, shadows } from '../theme';
import { useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import TimerSettings from '../components/TimerSettings';
import { endModeSession } from '../stats/modeSessions';
export type PresetKey = 'study' | 'sleep' | 'commute';

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
    image: require('../../assets/createMode/ModoStudy.png'),
    rows: [
      { label: 'DO NOT DISTURB', checked: true },
      { label: 'PLAYLIST', checked: false },
      { label: 'TIMER', checked: true },
    ],
    time: '2:00:00',
  },
  sleep: {
    title: 'SLEEP MODE',
    image: require('../../assets/createMode/ModoSleep.png'),
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
    image: require('../../assets/createMode/ModoRun.png'),
    rows: [
      { label: 'PLAYLIST', checked: true },
      { label: 'YOUR ROUTE', checked: false, box: true },
      { label: 'WEATHER', checked: true, box: true },
    ],
  },
};

// blends a colour toward black (used for the panel behind the rows)
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
  //Timer feature
  const [durationMinutes, setDurationMinutes] = useState(120);
  const {
    formattedTime,
    isRunning,
    start,
    pause,
    reset,
  } = useCountdown(durationMinutes * 60);
  // const [isRunning, setIsRunning] = useState<boolean>(false);



  return (
    <LinearGradient
      colors={[c.gradientTop, c.gradientBottom]}
      locations={GRADIENT_STOPS}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
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
            {preset.rows.map((r) => (
              <View key={r.label}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.box,
                      { borderColor: c.accent, backgroundColor: r.checked ? c.text : c.accent },
                    ]}
                  >
                    {r.checked && <Ionicons name="checkmark" size={24} color={c.accent} />}
                  </View>
                  <Text style={[styles.rowText, { color: c.text }]}>{r.label}</Text>
                </View>
                {r.box && <View style={[styles.placeholderBox, { backgroundColor: c.accent }]} />}
              </View>
            ))}
          </View>

          {/* display timer */}
          {mode === 'study' && (
            <View style={{ marginTop: 20 }}>
              <TimerSettings
                durationMinutes={durationMinutes}
                onDurationChange={setDurationMinutes}
                textColor={c.text}
                accentColor={c.accent}
              />
            </View>
          )}
          {mode === 'study' && (
            <>
              <Text style={[styles.time, { color: c.text }]}>
                {formattedTime}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                <Pressable onPress={isRunning ? pause : start}>
                  <Text style={{ color: c.text }}>
                    {isRunning ? 'PAUSE' : 'START'}
                  </Text>
                </Pressable>

                <Pressable onPress={reset}>
                  <Text style={{ color: c.text }}>
                    RESET
                  </Text>
                </Pressable>
              </View>
            </>
          )}
          {preset.timeNote && <Text style={[styles.timeNote, { color: c.text }]}>{preset.timeNote}</Text>}

          {/* more space above the buttons when there's no time text (Commute) */}
          <View style={[styles.buttons, { marginTop: preset.time ? 20 : 44 }]}>
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: c.accent }, pressed && styles.pressed]}
              onPress={onChangeSettings}
            >
              <Text style={[styles.buttonText, { color: c.text }]}>CHANGE SETTINGS</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: c.accent }, pressed && styles.pressed]}
                onPress={() => {
                endModeSession(); // saves when the mode ended, for stats
                onEnd?.();
              }}
            >
              <Text style={[styles.buttonText, { color: c.text }]}>END MODE</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
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
});