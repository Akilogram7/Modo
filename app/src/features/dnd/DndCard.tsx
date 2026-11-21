import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../assets/theme';
import {
  CAN_OPEN_DND_SETTINGS,
  CAN_RUN_SHORTCUTS,
  DND_SHORTCUTS,
  dndOnForMode,
  openDndShortcutLink,
  openPhoneDndSettings,
  useDndSetup,
} from './dnd';

// Shows under a DO NOT DISTURB checkbox or switch.
// iPhone: one-time setup of the two shortcuts, then a short note.
// Android: a button to the Do Not Disturb settings.

type Props = {
  textColor: string;
  accentColor: string;
  // true inside a running mode: finishing setup turns Do Not Disturb on straight away
  inMode?: boolean;
};

export default function DndCard({ textColor, accentColor, inMode = false }: Props) {
  const setup = useDndSetup();

  if (CAN_OPEN_DND_SETTINGS) {
    return (
      <View style={[styles.card, { borderColor: accentColor }]}>
        <Text style={[styles.text, { color: textColor }]}>
          Android only lets you switch Do Not Disturb yourself. This opens the setting:
        </Text>
        <Pressable
          onPress={() => void openPhoneDndSettings()}
          style={[styles.button, { backgroundColor: accentColor }]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: textColor }]}>OPEN DO NOT DISTURB</Text>
        </Pressable>
      </View>
    );
  }

  if (!CAN_RUN_SHORTCUTS || !setup.ready) return null;

  if (setup.added) {
    return (
      <View style={[styles.card, { borderColor: accentColor }]}>
        <Text style={[styles.text, { color: textColor }]}>
          Your iPhone&apos;s Do Not Disturb turns on when this mode starts and off when it ends.
        </Text>
        <Pressable onPress={() => setup.setAdded(false)} accessibilityRole="button">
          <Text style={[styles.link, { color: textColor }]}>Not working? Set it up again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: accentColor }]}>
      <Text style={[styles.heading, { color: textColor }]}>One-time setup</Text>
      <Text style={[styles.text, { color: textColor }]}>
        iPhones only let Modo switch Do Not Disturb through the Shortcuts app. Tap each button,
        then tap &quot;Get Shortcut&quot;. Don&apos;t rename them.
      </Text>
      <Pressable
        onPress={() => openDndShortcutLink('on')}
        style={[styles.button, { backgroundColor: accentColor }]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: textColor }]}>1. ADD “{DND_SHORTCUTS.on.name.toUpperCase()}”</Text>
      </Pressable>
      <Pressable
        onPress={() => openDndShortcutLink('off')}
        style={[styles.button, { backgroundColor: accentColor }]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: textColor }]}>2. ADD “{DND_SHORTCUTS.off.name.toUpperCase()}”</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setup.setAdded(true);
          if (inMode) void dndOnForMode();
        }}
        style={[styles.doneButton, { borderColor: textColor }]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: textColor }]}>DONE, I ADDED BOTH</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontFamily: fonts.headingBold,
  },
  text: {
    fontSize: 14,
    fontFamily: fonts.headingBold,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.headingBold,
    textDecorationLine: 'underline',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  doneButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
  },
});
