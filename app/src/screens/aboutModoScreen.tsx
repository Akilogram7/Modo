import type { ComponentProps } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradientStops, gradientDirection, fonts, shadows } from '../../assets/theme';
import { FloatingCloud } from '../components/AuthBackground';

type Props = {
  onBack: () => void;
};

// The four feature tiles. Change the text or colours here.
const FEATURES: {
  title: string;
  text: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tile: string; // tile background
  circle: string; // icon circle
}[] = [
  {
    title: 'Custom Modes',
    text: 'Create modes that fit your everyday routine.',
    icon: 'star',
    tile: '#E9E0FB',
    circle: '#A593E0',
  },
  {
    title: 'Group Mode',
    text: 'Share a mode with a code so friends can join in.',
    icon: 'people',
    tile: '#FBE0E8',
    circle: '#E57A9D',
  },
  {
    title: 'Achievements',
    text: 'Track your progress and celebrate milestones.',
    icon: 'trophy',
    tile: '#DFF3E6',
    circle: '#6CBF8B',
  },
  {
    title: 'Progress Tracking',
    text: 'See your productivity and consistency over time.',
    icon: 'trending-up',
    tile: '#FDE9D2',
    circle: '#F5A94B',
  },
];

export default function AboutModoScreen({ onBack }: Props) {
  return (
    <LinearGradient
      colors={[colors.gradientLight, colors.gradientMain]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={styles.bg}
    >
      {/* Animated background */}
      <FloatingCloud top={0.75} size={1.5} opacity={0.50} duration={20000} startAt={0.2} from="left" />
      <FloatingCloud top={0.40} size={1.5} opacity={0.10} duration={25000} startAt={0.1} from="left" />
      <FloatingCloud top={0.20} size={2.0} opacity={0.50} duration={20000} startAt={0.3} from="right" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <View style={styles.topBar}>
            {/* The title can't take taps, so it never blocks the back arrow */}
            <View style={styles.titleWrap} pointerEvents="none">
              <Text style={styles.title}>About Modo</Text>
            </View>

            {/* Back arrow comes last so it sits on top and gets the tap */}
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color="#171717" />
            </Pressable>
          </View>

          <Image
            source={require('../../assets/Modos/ModoExcited.png')}
            style={styles.hero}
            resizeMode="contain"
          />

          {/* Meet Modo */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meet Modo</Text>
            <Text style={styles.cardText}>
              Modo is your personal productivity companion. Create modes for everyday routines and
              bring the things you need together in one place.
            </Text>
          </View>

          {/* What can you do */}
          <Text style={styles.sectionTitle}>What Can You Do With Modo?</Text>
          <View style={styles.grid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={[styles.tile, { backgroundColor: f.tile }]}>
                <View style={[styles.tileIcon, { backgroundColor: f.circle }]}>
                  <Ionicons name={f.icon} size={22} color="#fff" />
                </View>
                <View style={styles.tileText}>
                  <Text style={styles.tileTitle}>{f.title}</Text>
                  <Text style={styles.tileBody}>{f.text}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Our mission */}
          <View style={[styles.wideCard, { backgroundColor: '#E9DDFB' }]}>
            <Ionicons name="locate" size={42} color="#8A74D6" />
            <View style={styles.wideText}>
              <Text style={styles.wideTitle}>Our Mission</Text>
              <Text style={styles.wideBody}>Making everyday routines easier, one tap at a time.</Text>
            </View>
          </View>

          {/* Fun fact */}
          <View style={[styles.wideCard, { backgroundColor: '#FFF6F3' }]}>
            <Ionicons name="bulb" size={42} color="#F5B83D" />
            <View style={styles.wideText}>
              <Text style={styles.wideTitle}>Fun Fact!</Text>
              <Text style={styles.wideBody}>
                Modo was inspired by the word 'Mode'! Since our app revolves around creating and
                switching between different modes for everyday activities, we gave it a name of its
                own.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },

  // extra space at the bottom so the last card scrolls up above the tab bar
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 170,
  },

  topBar: {
    marginTop: 8,
    height: 48,
    justifyContent: 'center',
  },

  titleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
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
  },

  hero: {
    width: 170,
    height: 150,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 6,
  },

  card: {
    backgroundColor: '#FFF6F3',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    ...shadows.raised,
  },

  cardTitle: {
    fontSize: 26,
    fontFamily: fonts.headingBold,
    color: colors.heading,
  },

  cardText: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fonts.bodyBold,
    color: colors.heading,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.headingBold,
    color: colors.heading,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  tile: {
    width: '48.5%',
    borderRadius: 20,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadows.raised,
  },

  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tileText: {
    flex: 1,
  },

  tileTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.headingBold,
    color: colors.heading,
  },

  tileBody: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fonts.bodyBold,
    color: colors.heading,
    opacity: 0.8,
  },

  wideCard: {
    marginTop: 14,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...shadows.raised,
  },

  wideText: {
    flex: 1,
  },

  wideTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontFamily: fonts.headingBold,
    color: colors.heading,
  },

  wideBody: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: fonts.bodyBold,
    color: colors.heading,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});