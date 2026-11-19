import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts } from '../../../assets/theme';
import AlarmTimePicker from './AlarmTimePicker';
import { formatAlarmTime } from './alarmTime';
import { MAX_ALARMS, MAX_ALARM_TITLE, newAlarm, type ModeAlarm } from './alarmList';

// The list of alarms on the Create / Edit Mode screen: a title and a time for each,
// plus "Add alarm". They ring after the mode is started.

type Props = {
  alarms: ModeAlarm[];
  onChange: (alarms: ModeAlarm[]) => void;
  textColor: string;
  accentColor: string;
};

export default function AlarmListEditor({ alarms, onChange, textColor, accentColor }: Props) {
  const update = (id: string, changes: Partial<ModeAlarm>) =>
    onChange(alarms.map((a) => (a.id === id ? { ...a, ...changes } : a)));

  return (
    <View style={styles.list}>
      {alarms.map((alarm, i) => (
        <View key={alarm.id} style={[styles.card, { borderColor: textColor }]}>
          <View style={styles.header}>
            <Text style={[styles.number, { color: textColor }]}>Alarm {i + 1}</Text>
            {alarms.length > 1 && (
              <Pressable
                onPress={() => onChange(alarms.filter((a) => a.id !== alarm.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove alarm ${i + 1}`}
              >
                <Text style={[styles.remove, { color: textColor }]}>Remove</Text>
              </Pressable>
            )}
          </View>

          <TextInput
            value={alarm.title}
            onChangeText={(title) => update(alarm.id, { title })}
            placeholder="Title (optional), like Gym"
            placeholderTextColor="rgba(100,100,100,0.7)"
            maxLength={MAX_ALARM_TITLE}
            accessibilityLabel={`Alarm ${i + 1} title`}
            style={styles.input}
          />

          <AlarmTimePicker
            value={alarm.time}
            onChange={(time) => update(alarm.id, { time })}
            textColor={textColor}
            accentColor={accentColor}
          />
          <Text style={[styles.note, { color: textColor }]}>
            Rings at {formatAlarmTime(alarm.time)} after you start this mode
          </Text>
        </View>
      ))}

      {alarms.length < MAX_ALARMS && (
        <Pressable
          onPress={() => onChange([...alarms, newAlarm()])}
          style={[styles.addButton, { backgroundColor: accentColor }]}
          accessibilityRole="button"
        >
          <Text style={styles.addText}>+ Add alarm</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  number: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
  remove: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
  },
  note: {
    fontSize: 14,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  addButton: {
    alignSelf: 'center',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: fonts.headingBold,
  },
});
