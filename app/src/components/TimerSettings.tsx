
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fonts } from '../theme';

type Props = {
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  textColor: string;
  accentColor: string;
};

const PRESET_DURATIONS = [15, 25, 30, 60, 120];

export default function TimerSettings({
  durationMinutes,
  onDurationChange,
  textColor,
  accentColor,
}: Props) {
  const [custom, setCustom] = useState(
    !PRESET_DURATIONS.includes(durationMinutes)
  );
  const [customInput, setCustomInput] = useState(
    String(durationMinutes)
  );

  const selectPreset = (minutes: number) => {
    setCustom(false);
    onDurationChange(minutes);
  };

  const updateCustom = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setCustomInput(cleaned);

    const minutes = Number(cleaned);
    if (minutes > 0 && minutes <= 1440) {
      onDurationChange(minutes);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: textColor }]}>
        TIMER DURATION
      </Text>

      <View style={styles.presets}>
        {PRESET_DURATIONS.map(minutes => {
          const selected =
            !custom && durationMinutes === minutes;

          return (
            <Pressable
              key={minutes}
              onPress={() => selectPreset(minutes)}
              style={[
                styles.presetButton,
                {
                  backgroundColor: selected
                    ? accentColor
                    : 'rgba(255,255,255,0.2)',
                  borderColor: textColor,
                },
              ]}
            >
              <Text
                style={[styles.presetText, { color: textColor }]}
              >
                {minutes >= 60
                  ? `${minutes / 60}h`
                  : `${minutes}m`}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => {
            setCustom(true);
            setCustomInput(String(durationMinutes));
          }}
          style={[
            styles.presetButton,
            {
              backgroundColor: custom
                ? accentColor
                : 'rgba(255,255,255,0.2)',
              borderColor: textColor,
            },
          ]}
        >
          <Text style={[styles.presetText, { color: textColor }]}>
            Custom
          </Text>
        </Pressable>
      </View>

      {custom && (
        <View style={styles.customRow}>
          <TextInput
            value={customInput}
            onChangeText={updateCustom}
            keyboardType="number-pad"
            placeholder="Enter minutes"
            placeholderTextColor="rgba(100,100,100,0.7)"
            style={styles.input}
            maxLength={4}
          />
          <Text style={[styles.unit, { color: textColor }]}>
            min
          </Text>
        </View>
      )}

      <Text style={[styles.selectedText, { color: textColor }]}>
        Selected: {durationMinutes} minutes
      </Text>
      {custom && (
        <Text style={[styles.helper, { color: textColor }]}>
          Enter 1–1440 minutes
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  heading: {
    fontSize: 17,
    fontFamily: fonts.headingBold,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 65,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
  },
  unit: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
  selectedText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
  },
  helper: {
    fontSize: 12,
    opacity: 0.8,
  },
});
