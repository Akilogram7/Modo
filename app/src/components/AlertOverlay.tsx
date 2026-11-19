import { useEffect, type ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, shadows } from '../../assets/theme';

// A full-screen alert that's hard to miss: big icon, big title, and the phone vibrates.
// Used when a timer switches to a break (or back to focus), and when an alarm rings.

type Button = {
  label: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  color: string; // background of the card
  buttons: Button[]; // the first one is the main (biggest) button
  // 'loop' keeps vibrating until a button is tapped (alarms).
  // 'short' buzzes a few times (timer switches).
  vibrate: 'loop' | 'short';
};

// on, off, on, off... in milliseconds
const LOOP_PATTERN = [0, 800, 600];
const SHORT_PATTERN = [0, 500, 300, 500, 300, 500];

export default function AlertOverlay({ visible, icon, title, message, color, buttons, vibrate }: Props) {
  useEffect(() => {
    if (!visible) return;

    if (vibrate === 'loop') {
      Vibration.vibrate(LOOP_PATTERN, true);
    } else {
      Vibration.vibrate(SHORT_PATTERN);
    }

    return () => Vibration.cancel();
  }, [visible, vibrate]);

  const [main, ...others] = buttons;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => main?.onPress()}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: color }]} accessibilityRole="alert">
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={56} color={color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message !== undefined && <Text style={styles.message}>{message}</Text>}

          {main && (
            <Pressable
              onPress={main.onPress}
              style={({ pressed }) => [styles.mainButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={[styles.mainButtonText, { color }]}>{main.label}</Text>
            </Pressable>
          )}

          {others.map((button) => (
            <Pressable
              key={button.label}
              onPress={button.onPress}
              style={({ pressed }) => [styles.otherButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.otherButtonText}>{button.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...shadows.raised,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 18,
    fontSize: 38,
    lineHeight: 46,
    fontFamily: fonts.headingBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.bodyBold,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
  },
  mainButton: {
    marginTop: 24,
    alignSelf: 'stretch',
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    fontSize: 24,
    fontFamily: fonts.headingBold,
  },
  otherButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  otherButtonText: {
    fontSize: 18,
    fontFamily: fonts.headingBold,
    color: '#FFFFFF',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});
