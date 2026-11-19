import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fonts,
  shadows,
  backgroundColors,
} from '../../assets/theme';
import { achievements, RARITY_XP } from './achievementCatalog';
// ─────────────── ACHIEVEMENT COLOURS ───────────────
const ACHIEVEMENT_COLORS = {
  gradientLight: '#FFEFD0',
  gradientMain: '#FFB429',
  box: '#D38900',
  lockedBox: '#B19364',
  secretBox: backgroundColors[9],
  text: '#FFFFFF',
  secondaryText: '#FFF0D6',
  xp: '#FFE3A3',
};
// ─────────────── RARITY COLOURS ───────────────
// Full colours for unlocked achievements
const RARITY_COLORS = {
  Common: '#C8B8A5',
  Uncommon: '#AEB8C2',
  Rare: '#729BD3',
  Epic: '#A17BC9',
  Legendary: '#ffab03',
  Secret: ACHIEVEMENT_COLORS.secretBox,
} as const;
// Softer colours for locked achievements
const LOCKED_RARITY_COLORS = {
  Common: '#B6AA9A',
  Uncommon: '#929DA8',
  Rare: '#7489A5',
  Epic: '#89779D',
  Legendary: '#BAA075',
  Secret: ACHIEVEMENT_COLORS.secretBox,
} as const;
// Display order
const RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Secret',
] as const;
const RARITY_EMOJIS = {
  Common: '🌱',
  Uncommon: '🥈',
  Rare: '💎',
  Epic: '👑',
  Legendary: '🦄',
  Secret: '🔮',
};

// ─────────────── GRADIENT ───────────────
const GRADIENT_STOPS = [0.36, 0.48] as const;
const GRADIENT_START = { x: 1, y: 0 };
const GRADIENT_END = { x: 0.22, y: 0.735 };

// ─────────────── CARD DIMENSIONS ───────────────
const BOX_GAP = 12;

// ─────────────── FRONTEND PREVIEW ───────────────
// true = show all achievements unlocked
// false = show temporary locked/unlocked data

const PREVIEW_ALL_UNLOCKED = false;
const UNLOCKED_ACHIEVEMENTS = [1, 3, 5];
const ACHIEVEMENT_PROGRESS: Record<number, number> = {
  1: 100,
  2: 60,
  3: 100,
  4: 25,
  5: 100,
};

type Props = {
  onBack?: () => void;
};

export default function AchievementsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Two columns with slightly rectangular cards
  const boxW = (width - 32 - BOX_GAP) / 2;
  const boxH = boxW * 0.95;
  return (
    <LinearGradient
      colors={[
        ACHIEVEMENT_COLORS.gradientLight,
        ACHIEVEMENT_COLORS.gradientMain,
      ]}
      locations={GRADIENT_STOPS}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─────────────── TITLE ─────────────── */}
        <Text
          style={styles.title}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          ACHIEVEMENTS
        </Text>
        {/* ─────────────── RARITY SECTIONS ─────────────── */}
        {RARITIES.map((rarity) => {
          const rarityAchievements = achievements.filter(
            (achievement) => achievement.rarity === rarity
          );

          // Temporary preview count; backend unlock data will replace this.
          const unlockedCount = rarityAchievements.filter(
            (achievement) =>
              PREVIEW_ALL_UNLOCKED ||
              UNLOCKED_ACHIEVEMENTS.includes(achievement.id)
          ).length;

          return (
            <View key={rarity} style={styles.raritySection}>
              {/* RARITY HEADING */}
              <View style={styles.rarityHeader}>
                <View style={styles.rarityHeadingRow}>
                  <Text style={styles.rarityEmoji}>
                    {RARITY_EMOJIS[rarity]}
                  </Text>
                  <Text style={styles.rarityTitle}>
                    {rarity.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.rarityCount}>
                  {unlockedCount}/{rarityAchievements.length} Unlocked
                </Text>
              </View>
              {/* ACHIEVEMENT CARDS */}
              <View style={styles.grid}>
                {rarityAchievements.map((achievement) => {
                  const isUnlocked =
                    PREVIEW_ALL_UNLOCKED ||
                    UNLOCKED_ACHIEVEMENTS.includes(achievement.id);
                  const isHiddenSecret =
                    achievement.rarity === 'Secret' && !isUnlocked;
                  const progress = isUnlocked
                    ? 100
                    : Math.max(
                        0,
                        Math.min(
                          100,
                          ACHIEVEMENT_PROGRESS[achievement.id] ?? 0
                        )
                      );
                  const cardColor = isUnlocked
                    ? RARITY_COLORS[achievement.rarity]
                    : LOCKED_RARITY_COLORS[achievement.rarity];
                  return (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementCard,
                        {
                          width: boxW,
                          height: boxH,
                          backgroundColor: cardColor,
                        },
                      ]}
                    >
                      <View style={styles.cardContent}>
                        {/* EMOJI */}
                        <Text style={styles.achievementIcon}>
                          {isHiddenSecret
                            ? '❔'
                            : isUnlocked
                              ? achievement.emoji
                              : '🔒'}
                        </Text>
                        {/* NAME */}
                        <Text
                          style={styles.achievementName}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                        >
                          {isHiddenSecret
                            ? '???'
                            : achievement.name}
                        </Text>
                        {/* DESCRIPTION */}
                        <Text
                          style={styles.achievementDescription}
                          numberOfLines={3}
                          adjustsFontSizeToFit
                        >
                          {isHiddenSecret
                            ? 'A secret awaits...'
                            : achievement.description}
                        </Text>
                        {/* RARITY + XP */}
                        <View style={styles.rewardRow}>
                          <Text
                            style={styles.achievementRarity}
                            numberOfLines={1}
                          >
                            {isHiddenSecret
                              ? 'Secret'
                              : isUnlocked
                                ? achievement.rarity
                                : 'Locked'}
                          </Text>
                          <Text
                            style={styles.achievementXP}
                            numberOfLines={1}
                          >
                            ⭐ +{RARITY_XP[achievement.rarity]} XP
                          </Text>
                        </View>
                        {/* PROGRESS BAR */}
                        {!isUnlocked && !isHiddenSecret && (
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${progress}%`,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.progressText}>
                              {progress}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
        {/* ─────────────── GO BACK BUTTON ─────────────── */}
        <View style={styles.buttonWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
            ]}
            onPress={onBack}
          >
            <Text style={styles.buttonText}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
// ─────────────── STYLES ───────────────
const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
  },
  // ─────────────── TITLE ───────────────
  title: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    color: colors.heading,
    textAlign: 'center',
    marginBottom: 24,
  },
  // ─────────────── RARITY SECTIONS ───────────────
  raritySection: {
    marginBottom: 30,
  },
  rarityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  rarityHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rarityEmoji: {
    fontSize: 23,
  },
  rarityTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 23,
    color: colors.heading,
  },
  rarityCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.otherText,
    marginLeft: 6,
  },
  // ─────────────── GRID ───────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 28,
  },
  // ─────────────── ACHIEVEMENT CARD ───────────────
  achievementCard: {
    borderRadius: 18,
    padding: 9,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },
  cardContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  achievementIcon: {
    fontSize: 28,
    textAlign: 'center',
    includeFontPadding: false,
  },
  achievementName: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  achievementDescription: {
    fontFamily: fonts.heading,
    fontSize: 10,
    lineHeight: 14,
    color: '#FFF0D6',
    textAlign: 'center',
  },
  // ─────────────── RARITY + XP ───────────────
  rewardRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 7,
  },
  achievementRarity: {
    fontFamily: fonts.headingBold,
    fontSize: 10,
    lineHeight: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  achievementXP: {
    fontFamily: fonts.headingBold,
    fontSize: 10,
    lineHeight: 15,
    color: '#FFE3A3',
    textAlign: 'center',
    includeFontPadding: false,
  },
  // ─────────────── PROGRESS BAR ───────────────
  progressContainer: {
    width: '85%',
    alignItems: 'center',
    gap: 3,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  progressText: {
    fontFamily: fonts.headingBold,
    fontSize: 9,
    lineHeight: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  // ─────────────── GO BACK BUTTON ───────────────
  buttonWrap: {
    alignItems: 'center',
    marginTop: 36,
  },
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
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});