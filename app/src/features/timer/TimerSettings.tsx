import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fonts } from '../../../assets/theme';

type Props = {
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  textColor: string;
  accentColor: string;
  // Optional breaks: pass both to show the BREAKS row (0 = no breaks)
  breakMinutes?: number;
  onBreakChange?: (minutes: number) => void;
};

const PRESET_DURATIONS = [15, 25, 30, 60, 120];

// Break lengths you can pick. 0 = no breaks. "Custom" lets them type any length.
export const BREAK_OPTIONS = [0, 5, 10, 15];
const MAX_BREAK_MINUTES = 120;

export default function TimerSettings({
  durationMinutes,
  onDurationChange,
  textColor,
  accentColor,
  breakMinutes,
  onBreakChange,
}: Props) {
  const [custom, setCustom] = useState(
    !PRESET_DURATIONS.includes(durationMinutes)
  );
  const [customInput, setCustomInput] = useState(
    String(durationMinutes)
  );
  // Custom break length (anything that isn't one of the buttons)
  const [customBreak, setCustomBreak] = useState(
    breakMinutes !== undefined && !BREAK_OPTIONS.includes(breakMinutes)
  );
  const [customBreakInput, setCustomBreakInput] = useState(
    breakMinutes ? String(breakMinutes) : ''
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

  const selectBreak = (minutes: number) => {
    setCustomBreak(false);
    onBreakChange?.(minutes);
  };

  const startCustomBreak = () => {
    setCustomBreak(true);
    // Keep the current break if there is one, otherwise start at 20 minutes
    const start = breakMinutes && breakMinutes > 0 ? breakMinutes : 20;
    setCustomBreakInput(String(start));
    onBreakChange?.(start);
  };

  const updateCustomBreak = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setCustomBreakInput(cleaned);

    const minutes = Number(cleaned);
    if (minutes > 0 && minutes <= MAX_BREAK_MINUTES) {
      onBreakChange?.(minutes);
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

      {/* Breaks: after each focus round, a break starts on its own, then the next round */}
      {breakMinutes !== undefined && onBreakChange && (
        <>
          <Text style={[styles.heading, { color: textColor, marginTop: 4 }]}>
            BREAKS
          </Text>
          <View style={styles.presets}>
            {BREAK_OPTIONS.map((minutes) => {
              const selected = !customBreak && breakMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => selectBreak(minutes)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor: selected ? accentColor : 'rgba(255,255,255,0.2)',
                      borderColor: textColor,
                    },
                  ]}
                >
                  <Text style={[styles.presetText, { color: textColor }]}>
                    {minutes === 0 ? 'Off' : `${minutes}m`}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={startCustomBreak}
              accessibilityRole="button"
              accessibilityLabel="Custom break length"
              accessibilityState={{ selected: customBreak }}
              style={[
                styles.presetButton,
                {
                  backgroundColor: customBreak ? accentColor : 'rgba(255,255,255,0.2)',
                  borderColor: textColor,
                },
              ]}
            >
              <Text style={[styles.presetText, { color: textColor }]}>Custom</Text>
            </Pressable>
          </View>

          {customBreak && (
            <View style={styles.customRow}>
              <TextInput
                value={customBreakInput}
                onChangeText={updateCustomBreak}
                keyboardType="number-pad"
                placeholder="Break minutes"
                placeholderTextColor="rgba(100,100,100,0.7)"
                accessibilityLabel="Break minutes"
                style={styles.input}
                maxLength={3}
              />
              <Text style={[styles.unit, { color: textColor }]}>min</Text>
            </View>
          )}
          {customBreak && (
            <Text style={[styles.helper, { color: textColor }]}>
              Enter 1–{MAX_BREAK_MINUTES} minutes
            </Text>
          )}
          <Text style={[styles.selectedText, { color: textColor }]}>
            {breakMinutes === 0
              ? 'No breaks'
              : `${breakMinutes} min break after every ${durationMinutes} min of focus`}
          </Text>
        </>
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
