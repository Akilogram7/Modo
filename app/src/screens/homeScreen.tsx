import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradientStops, gradientDirection, fonts, shadows } from '../../assets/theme';
import { useAuth } from '../providers/AuthProvider';
import { CHARACTERS } from './createModeScreen';
import type { CustomMode } from '../types/mode';
import { FloatingCloud } from '../components/AuthBackground';
import ModoArch from '../components/ModoArch';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BubblyPlus from '../components/BubblyPlus';

// Colours only used on this screen
const CARD = {
  study: '#5B6BB5',
  sleep: '#D4709A',
  commute: '#7CC4A4',
  create: '#9B8AE0',
  achievements: '#F5A623'
};

type Props = {
  name?: string;
  onModePress?: (mode: 'study' | 'sleep' | 'commute') => void;
  onCreateMode?: () => void;
  onAchievements?: () => void;
  onSettings?: () => void;
  customModes?: CustomMode[];
  onCustomModePress?: (mode: CustomMode) => void;
};

const MODES = [
  {
    id: 'study',
    label: 'STUDY',
    color: CARD.study,
    img: require('../../assets/Modos/ModoStudy.png'),
  },
  {
    id: 'sleep',
    label: 'SLEEP',
    color: CARD.sleep,
    img: require('../../assets/Modos/ModoSleep.png'),
  },
  {
    id: 'commute',
    label: 'COMMUTE',
    color: CARD.commute,
    img: require('../../assets/Modos/ModoRun.png'),
  },
] as const;

export default function HomeScreen({
  name = 'there',
  onModePress,
  onCreateMode,
  onAchievements,
  onSettings,
  customModes = [],
  onCustomModePress,
}: Props) {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name ?? name;
  const { width } = useWindowDimensions();

  const charW = Math.min(width * 0.48, 260);
  const charH = (charW * 217) / 250;

  return (

    <LinearGradient
      colors={[colors.gradientLight, colors.gradientMain]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={styles.bg}
    >
      {/* Background */}

      {/* Top cluster, behind and around the logo */}
      <FloatingCloud top={0.75} size={1.5} opacity={0.50} duration={20000} startAt={0.2} from="left" />
      <FloatingCloud top={0.90} size={2.0} opacity={0.70} duration={30000} startAt={0.6} from="right" />
      <FloatingCloud top={0.65} size={1.0} opacity={0.35} duration={20000} startAt={0.4} from="left" />

      {/* Middle, faint, behind the form */}
      <FloatingCloud top={0.5} size={2.0} opacity={0.05} duration={20000} startAt={0.1} from="right" />
      <FloatingCloud top={0.40} size={1.5} opacity={0.10} duration={25000} startAt={0.1} from="left" />

      {/* Bottom cluster */}
      <FloatingCloud top={0.15} size={1.5} opacity={0.35} duration={30000} startAt={0.7} from="right" />
      <FloatingCloud top={0.20} size={2.0} opacity={0.50} duration={20000} startAt={0.3} from="left" />
      <FloatingCloud top={0.25} size={1.0} opacity={0.40} duration={30000} startAt={0.5} from="right" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <View style={[styles.header, { minHeight: charH * 0.8 }]}>

            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: -35,
                top: -50,
                opacity: 1,
              }}
            >
              <ModoArch
                width={charW * 1.35}
                height={charH * 1.55}
              />
            </View>

            <Image
              source={require('../../assets/Modos/ModoSunglasses.png')}
              style={{
                position: 'absolute',
                right: -5,
                top: -10,
                width: charW,
                height: charH,
              }}
              resizeMode="contain"
              pointerEvents="none"
            />

            <View>
              <Text style={styles.hello}>Hello,</Text>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.sub}>
                What are we{'\n'}in the mode for?
              </Text>
            </View>

            {/* Settings button */}
            <Pressable
              style={({ pressed }) => [
                styles.gear,
                pressed && styles.pressed,
              ]}
              onPress={onSettings}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons
                name="settings-sharp"
                size={24}
                color="#171717"
              />
            </Pressable>
          </View>

          <Text style={styles.heading}>Recent Modes</Text>

          {/* Mode grid */}
          <View style={styles.grid}>
            {MODES.map((m) => (
              <Pressable
                key={m.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: m.color },
                  pressed && styles.pressed,
                ]}
                onPress={() => onModePress?.(m.id)}
              >
                <Image
                  source={m.img}
                  style={styles.cardImg}
                  resizeMode="contain"
                />

                <Text style={styles.cardLabel}>{m.label}</Text>
              </Pressable>
            ))}

            {/* User-created modes use the same card layout as presets. */}
            {customModes.map((mode) => (
              <Pressable
                key={mode.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: mode.color },
                  pressed && styles.pressed,
                ]}
                onPress={() => onCustomModePress?.(mode)}
              >
                {mode.character !== null && CHARACTERS[mode.character] !== undefined && (
                  <Image source={CHARACTERS[mode.character]} style={styles.cardImg} resizeMode="contain" />
                )}
                <Text style={styles.cardLabel} numberOfLines={2} adjustsFontSizeToFit>
                  {mode.name || 'CUSTOM MODE'}
                </Text>
              </Pressable>
            ))}

            {/* Create mode */}
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: CARD.create, justifyContent: 'center', paddingBottom: 0 },
                pressed && styles.pressed,
              ]}
              onPress={onCreateMode}
            >
              <BubblyPlus size={100} />
              <Text style={[styles.cardLabel, { marginTop: 0 }]}>CREATE MODE</Text>
            </Pressable>
          </View>

          {/* Achievements banner */}
          <Pressable
            style={({ pressed }) => [
              styles.banner,
              pressed && styles.pressed,
            ]}
            onPress={onAchievements}
          >
            <Image
              source={require('../../assets/Modos/ModoYippee.png')}
              style={styles.bannerImg}
              resizeMode="contain"
            />

            <Text style={styles.bannerText}>
              Your{'\n'}Achievements
            </Text>

            <Image
              source={require('../../assets/Modos/ModoYippee.png')}
              style={[styles.bannerImg, { transform: [{ scaleX: -1 }] }]}
              resizeMode="contain"
            />

          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>

  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },

  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    aspectRatio: 786 / 1602,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },

  header: {
    marginTop: 8,
  },

  hello: {
    fontSize: 30,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginTop: -10,
  },

  name: {
    fontSize: 32,
    fontFamily: fonts.logo,
    color: colors.name,
    marginTop: -10,
  },

  sub: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.heading,
    color: colors.heading,
  },

  gear: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },

  title: {
    fontSize: 32,
    fontFamily: fonts.headingBold,
    color: colors.heading,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  heading: {
    fontSize: 32,
    fontFamily: fonts.headingBold,
    color: colors.otherText,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: -5,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  card: {
    width: '48%',
    aspectRatio: 1.15,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    ...shadows.raised,
  },

  cardImg: {
    position: 'absolute',
    top: 14,
    width: '68%',
    height: '62%',
  },

  plus: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 75,
    height: 75,
  },

  cardLabel: {
    color: colors.buttonText,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.5,
  },

  banner: {
    marginTop: 16,
    height: 82,
    borderRadius: 24,
    backgroundColor: CARD.achievements,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...shadows.raised
  },

  bannerImg: {
    width: 64,
    height: 64,
  },

  bannerText: {
    flex: 1,
    textAlign: 'center',
    color: colors.buttonText,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fonts.headingBold,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});

