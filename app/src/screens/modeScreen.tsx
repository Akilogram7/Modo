import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { backgroundColors, fonts, shadows } from '../theme';

const STUDY_MODO = require('../../assets/createMode/ModoStudy.png');

// Study mode uses one of the colours from theme.ts (index 1 = the blue)
const BASE = backgroundColors[1];

// title, checkboxes and buttons (from Figma, not in theme.ts)
const ACCENT = '#1D2C6E';

// blends a colour toward white
function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

// the rest of the colours on this page come from BASE
const COLORS = {
  gradientTop: lighten(BASE, 0.55), // light end of the background
  gradientBottom: BASE, // main colour
  accent: ACCENT,
  light: lighten(BASE, 0.92), // labels, timer, checked boxes and button text
};

function CheckRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.box, { backgroundColor: checked ? COLORS.light : COLORS.accent }]}>
        {checked && <Ionicons name="checkmark" size={24} color={COLORS.accent} />}
      </View>
      <Text style={styles.rowText}>{label}</Text>
    </View>
  );
}

type Props = {
  onChangeSettings?: () => void;
  onEnd?: () => void;
};

export default function ModeScreen({ onChangeSettings, onEnd }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const modoW = Math.min(width * 0.7, 300);

  return (
    <LinearGradient
      colors={[COLORS.gradientTop, COLORS.gradientBottom]}
      locations={[0.2, 0.5]}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>STUDY MODE</Text>

        <Image
          source={STUDY_MODO}
          style={{ width: modoW, height: modoW * 0.75, alignSelf: 'center' }}
          resizeMode="contain"
        />

        <View style={styles.list}>
          <CheckRow label="DO NOT DISTURB" checked />
          <CheckRow label="PLAYLIST" checked={false} />
          <CheckRow label="TIMER" checked />
        </View>

        <Text style={styles.timer}>2:00:00</Text>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={onChangeSettings}
          >
            <Text style={styles.buttonText}>CHANGE SETTINGS</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onEnd}>
            <Text style={styles.buttonText}>END MODE</Text>
          </Pressable>
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
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 8,
  },
  list: { marginTop: 24, paddingHorizontal: 20, rowGap: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  box: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 25,
    lineHeight: 32,
    fontFamily: fonts.headingBold,
    color: COLORS.light,
    letterSpacing: 0.5,
    marginLeft: 14,
  },
  timer: {
    fontSize: 40,
    fontFamily: fonts.headingBold,
    color: COLORS.light,
    textAlign: 'center',
    marginTop: 20,
  },
  buttons: { alignItems: 'center', marginTop: 20, rowGap: 12 },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 24,
    ...shadows.raised,
  },
  buttonText: {
    color: COLORS.light,
    fontSize: 30,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.5,
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});