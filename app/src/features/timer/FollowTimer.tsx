import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../assets/theme';
import type { SharedTimer } from '../../services/modeGroups';
import AlertOverlay from '../../components/AlertOverlay';
import { formatClock } from './cycle';
import { useFocusCycle } from './useFocusCycle';

// The timer friends see in a shared mode.
// It shows the host's countdown and breaks, and has no buttons: only the host can start, pause or change it.

type Props = {
  timer: SharedTimer | null;
  fallbackSeconds: number; // the mode's normal timer length, for before the host touches it
  fallbackBreakSeconds: number; // the mode's normal break length (0 = no breaks)
  hostName: string;
  textColor: string;
  accentColor: string;
};

export default function FollowTimer({
  timer,
  fallbackSeconds,
  fallbackBreakSeconds,
  hostName,
  textColor,
  accentColor,
}: Props) {
  const running = timer?.state === 'running';
  const elapsedAtCheck = timer?.elapsedSeconds ?? 0;
  const focusSeconds = timer?.focusSeconds ?? fallbackSeconds;
  const breakSeconds = timer?.breakSeconds ?? fallbackBreakSeconds;

  // Keep counting on this phone from the last time we heard from the host
  const { phase, alert, dismissAlert } = useFocusCycle({
    running,
    startedAt: running && timer ? timer.receivedAt - elapsedAtCheck * 1000 : null,
    pausedElapsed: elapsedAtCheck,
    focusSeconds,
    breakSeconds,
  });

  let status: string;
  if (timer?.state === 'paused') {
    status = `Paused by ${hostName}`;
  } else if (!running) {
    status = `Waiting for ${hostName} to start the timer`;
  } else if (phase.kind === 'done') {
    status = "Time's up!";
  } else if (phase.kind === 'break') {
    status = `Break time with ${hostName}`;
  } else {
    status = breakSeconds > 0
      ? `${hostName}'s timer is running, round ${phase.round}`
      : `${hostName}'s timer is running`;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.time, { color: textColor }]}>{formatClock(phase.secondsLeft)}</Text>
      <View
        style={[
          styles.status,
          { borderColor: accentColor },
          running && phase.kind === 'break' && { backgroundColor: accentColor },
        ]}
      >
        <Text style={[styles.statusText, { color: textColor }]}>{status}</Text>
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
  time: {
    fontSize: 40,
    lineHeight: 50,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginTop: 20,
  },
  status: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },
  statusText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
});
