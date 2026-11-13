import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, shadows, backgroundColors, gradientStops, gradientDirection } from '../theme';
import TimerSettings from '../components/TimerSettings';


export const CHARACTERS = [
  require('../../assets/createMode/ModoWave.png'),
  require('../../assets/createMode/ModoWink.png'),
  require('../../assets/createMode/ModoExcited.png'),
  require('../../assets/createMode/ModoPeep.png'),
  require('../../assets/createMode/ModoDrink.png'),
  require('../../assets/createMode/ModoHeart.png'),
  require('../../assets/createMode/ModoFlower.png'),
  require('../../assets/createMode/ModoQuestion.png'),
  require('../../assets/createMode/ModoRun.png'),
  require('../../assets/createMode/ModoStudy.png'),
  require('../../assets/createMode/ModoSad.png'),
  require('../../assets/createMode/ModoSleep.png'),
  require('../../assets/createMode/ModoLazy.png'),
  require('../../assets/createMode/ModoMusic.png'),
  require('../../assets/createMode/ModoYippee.png'),
];

const COLUMNS = 5;

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
  onCreate?: (mode: {
    name: string;
    color: string;
    character: number | null;
    timerEnabled: boolean;
    timerDuration: number | null;
  }) => void;
};

export default function CreateModeScreen({ onBack, onCreate }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const GAP = 12;
  const swatchW = (width - 48 - 28 - GAP * 3) / 4; // screen minus side padding, panel padding, and gaps
  const charSize = (width - 48 - 20) / COLUMNS; // screen minus side padding and panel padding
  const [name, setName] = useState('');
  const [color, setColor] = useState(backgroundColors[0]);
  const [character, setCharacter] = useState<number | null>(null);

  //timer 
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
  const [timerMinutes, setTimerMinutes] = useState<number>(25);

  // text and buttons follow the chosen background colour
  const dark = isDark(color);
  const textColor = dark ? '#FFFFFF' : darken(color, 0.45);
  const buttonColor = dark ? lighten(color, 0.25) : darken(color, 0.3);

  return (
    <LinearGradient
      colors={[lighten(color, 0.46), color]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: textColor }]}>CREATE MODE</Text>

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

        <View style={[styles.panel, styles.features]}>
          <View style={styles.featureHeader}>
            <Text style={[styles.featureTitle, { color: textColor }]}>
              FOCUS TIMER
            </Text>

            <Switch
              value={timerEnabled}
              onValueChange={setTimerEnabled}
              trackColor={{
                false: '#999',
                true: buttonColor,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          {timerEnabled && (
            <TimerSettings
              durationMinutes={timerMinutes}
              onDurationChange={setTimerMinutes}
              textColor={textColor}
              accentColor={buttonColor}
            />
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
            onPress={() =>
              onCreate?.({
                name,
                color,
                character,
                timerEnabled,
                timerDuration: timerEnabled ? timerMinutes * 60 : null,
              })
            }
          >
            <Text style={styles.buttonText}>Create Mode</Text>
          </Pressable>
        </View>
      </ScrollView>
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
});