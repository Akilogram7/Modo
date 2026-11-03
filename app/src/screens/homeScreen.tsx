
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradientStops } from '../mainTheme';

// Colours only used on this screen
const CARD = {
  study: '#5B6BB5',
  sleep: '#D4709A',
  commute: '#7CC4A4',
  create: '#9B8AE0',
  achievements: '#F5A623',
};

// Fonts
const FONT = {
  nunito: 'Nunito_700Bold',
  baloo: 'Baloo2_700Bold',
};

// Button shadow
const SHADOW = {
  boxShadow: '0px 4px 4px rgba(0,0,0,0.25), inset 0px 4px 4px rgba(0,0,0,0.25)',
};

type Props = {
  name?: string;
  onModePress?: (mode: 'study' | 'sleep' | 'commute') => void;
  onCreateMode?: () => void;
  onAchievements?: () => void;
  onSettings?: () => void;
};

const MODES = [
  {
    id: 'study',
    label: 'STUDY',
    color: CARD.study,
    img: require('../../assets/HomePage/ModoStudy.png'),
  },
  {
    id: 'sleep',
    label: 'SLEEP',
    color: CARD.sleep,
    img: require('../../assets/HomePage/ModoSleep.png'),
  },
  {
    id: 'commute',
    label: 'COMMUTE',
    color: CARD.commute,
    img: require('../../assets/HomePage/ModoRun.png'),
  },
] as const;

export default function HomeScreen({
  name = 'Hemanti',
  onModePress,
  onCreateMode,
  onAchievements,
  onSettings,
}: Props) {
  const { width } = useWindowDimensions();

  const charW = Math.min(width * 0.55, 260);
  const charH = (charW * 217) / 250;

  return (
    <LinearGradient
      colors={[colors.gradientLight, colors.gradientMain]}
      locations={[...gradientStops]}
      style={styles.bg}
    >
      {/* Background */}
      <Image
        source={require('../../assets/HomePage/Cloud Background.png')}
        style={styles.backgroundImage}
        resizeMode="contain"
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { minHeight: charH * 0.8 }]}>
            <Image
              source={require('../../assets/HomePage/ModoSunglasses.png')}
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
              <Text style={styles.name}>{name}</Text>
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

          <Text style={styles.title}>Your Modes</Text>

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

            {/* Create mode */}
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: CARD.create },
                pressed && styles.pressed,
              ]}
              onPress={onCreateMode}
            >
              <Image
                source={require('../../assets/HomePage/Plus.png')}
                style={styles.plus}
                resizeMode="contain"
              />

              <Text style={styles.cardLabel}>CREATE MODE</Text>
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
              source={require('../../assets/HomePage/ClassicModo 1.png')}
              style={styles.bannerImg}
              resizeMode="contain"
            />

            <Text style={styles.bannerText}>
              Your{'\n'}Achievements
            </Text>

            <Ionicons
              name="ribbon"
              size={32}
              color="#fff"
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
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  header: {
    marginTop: 8,
  },

  hello: {
    fontSize: 20,
    fontFamily: FONT.nunito,
    color: colors.text,
  },

  name: {
    fontSize: 26,
    fontFamily: FONT.nunito,
    color: colors.text,
  },

  sub: {
    fontSize: 14,
    fontFamily: FONT.nunito,
    color: colors.text,
    marginTop: 4,
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
    fontSize: 34,
    fontFamily: FONT.baloo,
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
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
    ...SHADOW,
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
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: FONT.baloo,
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
    ...SHADOW,
  },

  bannerImg: {
    width: 64,
    height: 64,
    marginRight: 10,
  },

  bannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
    fontFamily: FONT.baloo,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});
