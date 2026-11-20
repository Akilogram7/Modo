import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../assets/theme';

import type { TravelMode } from './routeTypes';

// The Baloo font sits a little high in its line on iPhone, so the text is nudged down to the middle
const TEXT_NUDGE = Platform.OS === 'ios' ? 3 : 0;

type Props = {
  value: TravelMode;
  onChange: (mode: TravelMode) => void;
  accentColor?: string; // button colour (defaults to the theme's brown)
};

export function TravelModeSelector({ value, onChange, accentColor = colors.otherText }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: accentColor },
          value !== 'driving' && styles.unselected,
          pressed && styles.pressed,
        ]}
        onPress={() => onChange('driving')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'driving' }}
      >
        <Text style={styles.buttonText}>DRIVE</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: accentColor },
          value !== 'walking' && styles.unselected,
          pressed && styles.pressed,
        ]}
        onPress={() => onChange('walking')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'walking' }}
      >
        <Text style={styles.buttonText}>WALK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // the mode that isn't picked: same colour, faded
  unselected: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: colors.buttonText,
    fontFamily: fonts.headingBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false, // Android only: removes extra space above and below the text
    transform: [{ translateY: TEXT_NUDGE }],
  },
});