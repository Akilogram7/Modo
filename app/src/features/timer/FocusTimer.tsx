import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme';
import { useCountdown } from './useCountdown';
import TimerSettings from './TimerSettings';

type Props = {
  initialDurationSeconds: number;
  textColor: string;
  accentColor: string;
  showSettings?: boolean;
};

// Reusable timer: each mounted FocusTimer owns its own countdown state.
// Unmounting it (e.g. unchecking TIMER) automatically stops its interval.
export default function FocusTimer({
  initialDurationSeconds,
  textColor,
  accentColor,
  showSettings = true,
}: Props) {
  const [durationMinutes, setDurationMinutes] = useState(
    Math.max(1, Math.round(initialDurationSeconds / 60))
  );
  const { formattedTime, isRunning, start, pause, reset } = useCountdown(durationMinutes * 60);

  return (
    <View style={styles.container}>
      {showSettings && (
        <TimerSettings
          durationMinutes={durationMinutes}
          onDurationChange={setDurationMinutes}
          textColor={textColor}
          accentColor={accentColor}
        />
      )}
      <Text style={[styles.time, { color: textColor }]}>{formattedTime}</Text>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          onPress={isRunning ? pause : start}
          style={[styles.controlButton, { borderColor: accentColor }]}
        >
          <Text style={[styles.controlText, { color: textColor }]}>
            {isRunning ? 'PAUSE' : 'START'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={reset}
          style={[styles.controlButton, { borderColor: accentColor }]}
        >
          <Text style={[styles.controlText, { color: textColor }]}>RESET</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  time: { fontSize: 40, lineHeight: 50, fontFamily: fonts.headingBold, textAlign: 'center', marginTop: 20 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  controlButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8 },
  controlText: { fontSize: 16, fontFamily: fonts.headingBold },
});
