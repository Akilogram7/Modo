import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../assets/theme';
import { AlarmTimePicker } from '../alarm';
import { formatAlarmTime, nextAlarmDate, timeUntil } from '../alarm/alarmTime';
import { STRENGTHS, isFilterOn } from './blueLight';
import { useBlueLight } from './BlueLightProvider';

// Blue light filter settings in Sleep mode: when the warm tint starts and stops, and how strong it is.

type Props = {
  textColor: string;
  accentColor: string;
};

type Editing = 'start' | 'end' | null;

// Phones don't let apps turn on Night Shift / Night Light, but Android can open the setting
async function openPhoneNightLight() {
  try {
    await Linking.sendIntent('android.settings.NIGHT_DISPLAY_SETTINGS');
  } catch {
    await Linking.sendIntent('android.settings.DISPLAY_SETTINGS').catch(() => {});
  }
}

export default function BlueLightCard({ textColor, accentColor }: Props) {
  const { settings, update } = useBlueLight();
  const [editing, setEditing] = useState<Editing>(null);

  // Keep "turns on in ..." up to date
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const on = isFilterOn(settings, new Date(now));
  const status =
    settings.start === settings.end
      ? 'On all day'
      : on
        ? `On now until ${formatAlarmTime(settings.end)}`
        : `Turns on in ${timeUntil(nextAlarmDate(settings.start, now).getTime() - now)}`;

  const timeButton = (which: 'start' | 'end', label: string) => (
    <Pressable
      onPress={() => setEditing((open) => (open === which ? null : which))}
      style={[
        styles.timeButton,
        { borderColor: textColor },
        editing === which && { backgroundColor: accentColor },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${formatAlarmTime(settings[which])}. Tap to change.`}
    >
      <Text style={[styles.timeLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.time, { color: textColor }]}>{formatAlarmTime(settings[which])}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.card, { borderColor: accentColor }]}>
      <Text style={[styles.heading, { color: textColor }]}>Warm tint schedule</Text>

      <View style={styles.times}>
        {timeButton('start', 'STARTS')}
        {timeButton('end', 'ENDS')}
      </View>
      <Text style={[styles.status, { color: textColor }]} numberOfLines={1}>
        {status}
      </Text>

      {editing && (
        <View style={styles.editor}>
          <AlarmTimePicker
            value={settings[editing]}
            onChange={(time) => update({ [editing]: time })}
            textColor={textColor}
            accentColor={accentColor}
          />
          <Pressable
            onPress={() => setEditing(null)}
            style={[styles.doneButton, { backgroundColor: accentColor }]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: textColor }]}>DONE</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.subheading, { color: textColor }]}>STRENGTH</Text>
      <View style={styles.chips}>
        {STRENGTHS.map((s) => {
          const picked = settings.strength === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => update({ strength: s.key })}
              style={[styles.chip, { borderColor: textColor }, picked && { backgroundColor: accentColor }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: picked }}
            >
              <Text style={[styles.chipText, { color: textColor }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Modo can only tint its own screens, so point them to the phone's setting for everything else */}
      <Text style={[styles.note, { color: textColor }]}>
        This tints Modo&apos;s screens.{' '}
        {Platform.OS === 'ios'
          ? 'For your whole phone, turn on Night Shift in Settings > Display & Brightness.'
          : 'For your whole phone, turn on Night Light (or Eye Comfort) too.'}
      </Text>
      {Platform.OS === 'android' && (
        <Pressable
          onPress={() => void openPhoneNightLight()}
          style={[styles.phoneButton, { borderColor: textColor }]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: textColor }]}>OPEN NIGHT LIGHT SETTINGS</Text>
        </Pressable>
      )}
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
  times: {
    flexDirection: 'row',
    gap: 10,
  },
  timeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: fonts.headingBold,
    opacity: 0.85,
  },
  time: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fonts.headingBold,
  },
  status: {
    fontSize: 14,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  editor: {
    gap: 10,
  },
  doneButton: {
    alignSelf: 'flex-end',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  subheading: {
    fontSize: 14,
    fontFamily: fonts.headingBold,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
  },
  note: {
    fontSize: 13,
    fontFamily: fonts.headingBold,
    opacity: 0.9,
  },
  phoneButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
  },
});
