import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadows } from '../theme';

// ─────────────── ACHIEVEMENTS COLOURS ───────────────
// (kept here so theme.ts doesn't change; can be moved into theme.ts later)
const ACHIEVEMENT_COLORS = {
  gradientLight: '#FFEFD0',
  gradientMain: '#FFB429',
  box: '#D38900', // achievement boxes and the Go Back button
  text: '#FFFFFF', // Go Back text
};

// same linear gradient as the mode pages (from Figma: stops at 36% and 48%)
const GRADIENT_STOPS = [0.36, 0.48] as const;
const GRADIENT_START = { x: 1, y: 0 };
const GRADIENT_END = { x: 0.22, y: 0.735 };

const BOX_COUNT = 8;
const BOX_GAP = 24; // space between the two columns

type Props = {
  onBack?: () => void;
};

export default function AchievementsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // exact box size: two columns inside the 24px side padding
  const boxW = (width - 48 - BOX_GAP) / 2;
  const boxH = boxW / 1.35;

  return (
    <LinearGradient
      colors={[ACHIEVEMENT_COLORS.gradientLight, ACHIEVEMENT_COLORS.gradientMain]}
      locations={GRADIENT_STOPS}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} adjustsFontSizeToFit numberOfLines={1}>
          ACHIEVEMENTS
        </Text>

        <View style={styles.grid}>
          {Array.from({ length: BOX_COUNT }).map((_, i) => (
            <View
              key={i}
              style={{
                width: boxW,
                height: boxH,
                borderRadius: 18,
                backgroundColor: ACHIEVEMENT_COLORS.box,
              }}
            />
          ))}
        </View>

        <View style={styles.buttonWrap}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={onBack}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24 },
  title: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 28,
  },
  buttonWrap: { alignItems: 'center', marginTop: 36 },
  button: {
    backgroundColor: ACHIEVEMENT_COLORS.box,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 40,
    ...shadows.raised,
  },
  buttonText: {
    color: ACHIEVEMENT_COLORS.text,
    fontSize: 24,
    fontFamily: fonts.headingBold,
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});