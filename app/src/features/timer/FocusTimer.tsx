import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../assets/theme';
import TimerSettings from './TimerSettings';
import AlertOverlay from '../../components/AlertOverlay';
import { formatClock } from './cycle';
import { useFocusCycle } from './useFocusCycle';

// What the timer is doing, for anyone who needs to know (like friends in a shared mode)
export type TimerState = {
  state: 'waiting' | 'running' | 'paused';
  elapsedSeconds: number; // how long the timer has been running in total
  focusSeconds: number;
  breakSeconds: number; // 0 = no breaks
};

type Props = {
  initialDurationSeconds: number;
  initialBreakMinutes?: number; // 0 = no breaks
  textColor: string;
  accentColor: string;
  showSettings?: boolean;
  onStateChange?: (state: TimerState) => void;
};

export default function FocusTimer({
  initialDurationSeconds,
  initialBreakMinutes = 0,
  textColor,
  accentColor,
  showSettings = true,
  onStateChange,
}: Props) {
  const [durationMinutes, setDurationMinutes] = useState(
    Math.max(1, Math.round(initialDurationSeconds / 60))
  );
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes);

  const [hasStarted, setHasStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedElapsed, setPausedElapsed] = useState(0);

  const focusSeconds = durationMinutes * 60;
  const breakSeconds = breakMinutes * 60;

  const { phase, alert, dismissAlert } = useFocusCycle({
    running,
    startedAt,
    pausedElapsed,
    focusSeconds,
    breakSeconds,
    // A timer with no breaks stops when it reaches 0
    onFinished: () => {
      setRunning(false);
      setStartedAt(null);
      setPausedElapsed(focusSeconds);
    },
  });

  const report = (state: TimerState['state'], elapsedSeconds: number) =>
    onStateChange?.({ state, elapsedSeconds, focusSeconds, breakSeconds });

  const handleStartPause = () => {
    if (running && startedAt !== null) {
      const elapsed = Math.max(pausedElapsed, (Date.now() - startedAt) / 1000);
      setRunning(false);
      setStartedAt(null);
      setPausedElapsed(elapsed);
      report('paused', elapsed);
    } else if (phase.kind !== 'done') {
      setStartedAt(Date.now() - pausedElapsed * 1000);
      setRunning(true);
      setHasStarted(true);
      report('running', pausedElapsed);
    }
  };

  const handleReset = () => {
    setRunning(false);
    setStartedAt(null);
    setPausedElapsed(0);
    setHasStarted(false);
    dismissAlert();
    report('waiting', 0);
  };

  const handleDurationChange = (minutes: number) => {
    setDurationMinutes(minutes);
    onStateChange?.({ state: 'waiting', elapsedSeconds: 0, focusSeconds: minutes * 60, breakSeconds });
  };

  const handleBreakChange = (minutes: number) => {
    setBreakMinutes(minutes);
    onStateChange?.({ state: 'waiting', elapsedSeconds: 0, focusSeconds, breakSeconds: minutes * 60 });
  };

  const onBreak = phase.kind === 'break';

  return (
    <View style={styles.container}>
      {showSettings && !hasStarted && (
        <TimerSettings
          durationMinutes={durationMinutes}
          onDurationChange={handleDurationChange}
          breakMinutes={breakMinutes}
          onBreakChange={handleBreakChange}
          textColor={textColor}
          accentColor={accentColor}
        />
      )}

      {/* Which part of the session you're in (only matters when there are breaks) */}
      {breakSeconds > 0 && hasStarted && phase.kind !== 'done' && (
        <View style={[styles.phasePill, onBreak && { backgroundColor: accentColor }]}>
          <Text style={[styles.phaseText, { color: textColor }]}>
            {onBreak ? 'BREAK TIME' : `FOCUS, ROUND ${phase.round}`}
          </Text>
        </View>
      )}

      <Text style={[styles.time, { color: textColor }]}>
        {formatClock(phase.secondsLeft)}
      </Text>
      {phase.kind === 'done' && (
        <Text style={[styles.doneText, { color: textColor }]}>Session complete</Text>
      )}

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          onPress={handleStartPause}
          disabled={phase.kind === 'done'}
          style={[
            styles.controlButton,
            { borderColor: accentColor },
            phase.kind === 'done' && styles.controlDisabled,
          ]}
        >
          <Text style={[styles.controlText, { color: textColor }]}>
            {running ? 'PAUSE' : 'START'}
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

      <AlertOverlay
        visible={alert !== null}
        icon={alert?.kind === 'break' ? 'cafe' : alert?.kind === 'focus' ? 'book' : 'trophy'}
        title={alert?.title ?? ''}
        message={alert?.body}
        color={accentColor}
        vibrate="short"
        buttons={[{ label: 'Got it', onPress: dismissAlert }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  phasePill: {
    alignSelf: 'center',
    marginTop: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  phaseText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginTop: 20,
  },
  doneText: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
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
  controlDisabled: {
    opacity: 0.4,
  },
  controlText: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
});
