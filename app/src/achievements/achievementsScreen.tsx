import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadows } from '../../assets/theme';
import { achievements } from './achievementCatalog';

// ─────────────── ACHIEVEMENTS COLOURS ───────────────
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

const BOX_GAP = 12; // space between the two columns

type Props = {
  onBack?: () => void;
};

export default function AchievementsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

const boxW = (width - 32 - BOX_GAP) / 2;
const boxH = boxW * 0.95;

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
          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                {
                  width: boxW,
                  height: boxH,
                },
              ]}
            >
              <Text style={styles.achievementIcon}>💡</Text>

              <Text
                style={styles.achievementName}
                numberOfLines={2}
              >
                {achievement.name}
              </Text>

              <Text
                style={styles.achievementDescription}
                numberOfLines={2}
              >
                {achievement.description}
              </Text>

              <Text style={styles.achievementRarity}>
                {achievement.rarity}
              </Text>
            </View>
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
  scroll: { paddingHorizontal: 16 },
  title: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    color: colors.heading,
    textAlign: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 28,
  },

  achievementCard: {
    backgroundColor: '#D38900',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    ...shadows.raised,
  },

  achievementIcon: {
    fontSize: 35,
    marginBottom: 8,
  },

  achievementName: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },

    achievementDescription: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  achievementRarity: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: '#FFEFD0',
    marginTop: 4,
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