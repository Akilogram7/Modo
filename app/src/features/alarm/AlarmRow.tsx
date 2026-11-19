import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts } from '../../../assets/theme';
import AlertOverlay from '../../components/AlertOverlay';
import AlarmTimePicker from './AlarmTimePicker';
import { formatAlarmTime } from './alarmTime';
import { MAX_ALARM_TITLE, type ModeAlarm } from './alarmList';
import { useAlarm } from './useAlarm';

// One running alarm inside a mode: its title, time, when it rings, an on/off button,
// and the full-screen alarm when it goes off. Tap the time to change it.

type Props = {
  alarm: ModeAlarm;
  modeTitle: string; // like "Sleep mode", shown on the alarm
  textColor: string;
  accentColor: string;
  readOnly?: boolean; // friends in someone else's shared mode can't change anything
  startOpen?: boolean; // open the editor straight away (a just-added alarm)
  // To save changes (Sleep mode). Without these, changes only last while the mode is on.
  onChange?: (alarm: ModeAlarm) => void;
  onDelete?: () => void;
};

export default function AlarmRow({
  alarm,
  modeTitle,
  textColor,
  accentColor,
  readOnly = false,
  startOpen = false,
  onChange,
  onDelete,
}: Props) {
  const name = alarm.title.trim();
  const ring = useAlarm({
    initialTime: alarm.time,
    initialEnabled: alarm.enabled,
    label: name || modeTitle,
  });
  const [editing, setEditing] = useState(startOpen);

  const toggle = () => {
    ring.setEnabled(!ring.enabled);
    onChange?.({ ...alarm, enabled: !ring.enabled });
  };

  const changeTime = (time: string) => {
    ring.setTime(time);
    onChange?.({ ...alarm, time });
  };

  return (
    <View style={[styles.card, { borderColor: accentColor }]}>
      <View style={styles.top}>
        <Pressable
          style={styles.info}
          onPress={() => setEditing((open) => !open)}
          disabled={readOnly}
          accessibilityRole="button"
          accessibilityLabel={`${name || 'Alarm'} at ${formatAlarmTime(ring.time)}. Tap to change.`}
        >
          {name !== '' && (
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {name}
            </Text>
          )}
          <Text style={[styles.time, { color: textColor }, !ring.enabled && styles.off]}>
            {formatAlarmTime(ring.time)}
          </Text>
          <Text style={[styles.status, { color: textColor }]} numberOfLines={1}>
          {ring.status}
          </Text> 
        </Pressable>

        {!readOnly && (
          <Pressable
            onPress={toggle}
            style={[
              styles.toggle,
              { borderColor: textColor },
              ring.enabled && { backgroundColor: accentColor },
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: ring.enabled }}
            accessibilityLabel={`${name || 'Alarm'} on or off`}
          >
            <Text style={[styles.toggleText, { color: textColor }]}>{ring.enabled ? 'ON' : 'OFF'}</Text>
          </Pressable>
        )}
      </View>

      {editing && !readOnly && (
        <View style={styles.editor}>
          {/* Titles are set where the alarms are saved (Sleep mode, or Create/Edit Mode) */}
          {onChange && (
            <TextInput
              value={alarm.title}
              onChangeText={(title) => onChange({ ...alarm, title })}
              placeholder="Title (optional)"
              placeholderTextColor="rgba(255,255,255,0.7)"
              maxLength={MAX_ALARM_TITLE}
              style={[styles.titleInput, { color: textColor, borderColor: textColor }]}
            />
          )}
          <AlarmTimePicker
            value={ring.time}
            onChange={changeTime}
            textColor={textColor}
            accentColor={accentColor}
          />
          <View style={styles.editorButtons}>
            {onDelete && (
              <Pressable onPress={onDelete} style={styles.textButton} accessibilityRole="button">
                <Text style={[styles.textButtonText, { color: textColor }]}>DELETE</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setEditing(false)}
              style={[styles.doneButton, { backgroundColor: accentColor }]}
              accessibilityRole="button"
            >
              <Text style={[styles.textButtonText, { color: textColor }]}>DONE</Text>
            </Pressable>
          </View>
        </View>
      )}

      <AlertOverlay
        visible={ring.ringing}
        icon="alarm"
        title={name || 'Wake up!'}
        message={`${modeTitle}: it's ${formatAlarmTime(ring.time)}`}
        color={accentColor}
        vibrate="loop"
        buttons={[
          { label: 'Stop', onPress: ring.stop },
          { label: `Snooze ${ring.snoozeMinutes} min`, onPress: ring.snooze },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
  time: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: fonts.headingBold,
  },
  off: {
    opacity: 0.5,
  },
  status: {
    fontSize: 14,
    fontFamily: fonts.headingBold,
    opacity: 0.9,
  },
  toggle: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
  editor: {
    marginTop: 10,
    gap: 10,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: fonts.bodyBold,
  },
  editorButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  textButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  textButtonText: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
  doneButton: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
});
