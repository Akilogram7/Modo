import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../assets/theme';
import { useCountdown } from './useCountdown';
import TimerSettings from './TimerSettings';
import {
  scheduleTimerNotification,
  cancelTimerNotification,
} from './timerNotifications';

type Props = {
  initialDurationSeconds: number;
  textColor: string;
  accentColor: string;
  showSettings?: boolean;
};

export default function FocusTimer({
  initialDurationSeconds,
  textColor,
  accentColor,
  showSettings = true,
}: Props) {
  const [durationMinutes, setDurationMinutes] = useState(
    Math.max(1, Math.round(initialDurationSeconds / 60))
  );

  const [hasStarted, setHasStarted] = useState(false);

  const { timeLeft, formattedTime, isRunning, start, pause, reset } =
  useCountdown(durationMinutes * 60);
  const notificationIdRef = useRef<string | null>(null);
  const notificationGenerationRef = useRef(0);
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const clearNotification = async () => {
    notificationGenerationRef.current += 1;
    const id = notificationIdRef.current;
    notificationIdRef.current = null;
    await cancelTimerNotification(id);
  };

  const scheduleNotification = async () => {
    const generation = ++notificationGenerationRef.current;
    const id = await scheduleTimerNotification(timeLeftRef.current);

    if (generation !== notificationGenerationRef.current) {
      await cancelTimerNotification(id);
      return;
    }

    notificationIdRef.current = id;
  };

  useEffect(() => {
    return () => {
      notificationGenerationRef.current += 1;
      void cancelTimerNotification(notificationIdRef.current);
    };
  }, []);

  const handleStartPause = () => {
    if (isRunning) {
      pause();
      void clearNotification();
    } else if (timeLeft > 0) {
      start();
      setHasStarted(true);
      void scheduleNotification().catch(console.warn);
    }
  };

  const handleReset = () => {
    reset();
    setHasStarted(false);
    void clearNotification();
  };

  return (
    <View style={styles.container}>
      {showSettings && !hasStarted && (
        <TimerSettings
          durationMinutes={durationMinutes}
          onDurationChange={setDurationMinutes}
          textColor={textColor}
          accentColor={accentColor}
        />
      )}

      <Text style={[styles.time, { color: textColor }]}>
        {formattedTime}
      </Text>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          onPress={handleStartPause}
          style={[
            styles.controlButton,
            { borderColor: accentColor },
          ]}
        >
          <Text style={[styles.controlText, { color: textColor }]}>
            {isRunning ? 'PAUSE' : 'START'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleReset}
          style={[
            styles.controlButton,
            { borderColor: accentColor },
          ]}
        >
          <Text style={[styles.controlText, { color: textColor }]}>
            RESET
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  time: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginTop: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  controlButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  controlText: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
});
