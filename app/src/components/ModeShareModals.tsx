import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, shadows } from '../theme';
import type { HostedShare } from '../services/modeGroups';

// The two popups for sharing modes with friends:
//   ShareModeModal    - the host gets a code for one of their modes
//   JoinWithCodeModal - a friend types a code in

const PURPLE = '#9B8AE0';
const DANGER = '#D9534F';

// ---------- Host: share a mode ----------

type ShareProps = {
  modeName: string;
  share: HostedShare | undefined; // undefined = not shared yet
  onCreateCode: () => Promise<void>;
  onStopSharing: () => Promise<void>;
  onClose: () => void;
};

export function ShareModeModal({ modeName, share, onCreateCode, onStopSharing, onClose }: ShareProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingStop, setConfirmingStop] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
    setBusy(false);
  }

  function sendCode() {
    if (!share) return;
    // Opens the phone's normal share menu (Messages, Discord, and so on)
    void Share.share({
      message: `Join my ${modeName} mode on Modo! Go to Modes, tap "Join with a code" and enter ${share.code}`,
    });
  }

  return (
    <Popup onClose={onClose}>
      <Text style={styles.title}>Share {modeName}</Text>

      {!share ? (
        <>
          <Text style={styles.body}>
            Friends who enter your code get this mode with your settings. When you start it, it
            starts for them too.
          </Text>
          <BigButton label="Get a code" loading={busy} onPress={() => run(onCreateCode)} />
        </>
      ) : confirmingStop ? (
        <>
          <Text style={styles.body}>
            Stop sharing {modeName}? Friends who joined will lose this mode, and the code will stop
            working.
          </Text>
          <BigButton
            label="Stop sharing"
            color={DANGER}
            loading={busy}
            onPress={() => run(onStopSharing).then(() => setConfirmingStop(false))}
          />
          <TextButton label="Keep sharing" onPress={() => setConfirmingStop(false)} />
        </>
      ) : (
        <>
          <Text style={styles.body}>Friends enter this code under Modes, Join with a code.</Text>

          <View style={styles.codeBox}>
            <Text style={styles.code} selectable>
              {share.code}
            </Text>
          </View>

          <Text style={styles.members}>
            {share.members.length === 0
              ? 'No one has joined yet.'
              : `Joined: ${share.members.join(', ')}`}
          </Text>

          <BigButton label="Send code" onPress={sendCode} />
          <TextButton label="Stop sharing" color={DANGER} onPress={() => setConfirmingStop(true)} />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <TextButton label="Close" onPress={onClose} />
    </Popup>
  );
}

// ---------- Friend: join with a code ----------

type JoinProps = {
  onJoin: (code: string) => Promise<void>;
  onClose: () => void;
};

export function JoinWithCodeModal({ onJoin, onClose }: JoinProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 6) {
      setError('Codes are 6 characters long.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await onJoin(cleaned);
      onClose();
    } catch (e) {
      // The database says what went wrong, like a code that doesn't exist
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <Popup onClose={onClose}>
      <Text style={styles.title}>Join with a code</Text>
      <Text style={styles.body}>
        Enter the code a friend sent you. You get their mode, and when they start it, it starts for
        you too.
      </Text>

      <TextInput
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        style={styles.input}
        placeholder="ABC234"
        placeholderTextColor="#B9B9C3"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={join}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <BigButton label="Join mode" loading={busy} onPress={join} />
      <TextButton label="Cancel" onPress={onClose} />
    </Popup>
  );
}

// ---------- Shared pieces ----------

// A white card in the middle of a dimmed screen
function Popup({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BigButton({
  label,
  color = PURPLE,
  loading = false,
  onPress,
}: {
  label: string;
  color?: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.bigButton, { backgroundColor: color }, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigButtonText}>{label}</Text>}
    </Pressable>
  );
}

function TextButton({
  label,
  color = colors.text,
  onPress,
}: {
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.textButton} hitSlop={6} accessibilityRole="button">
      <Text style={[styles.textButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    ...shadows.raised,
  },

  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
  },

  body: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },

  codeBox: {
    backgroundColor: '#F1F1F4',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },

  code: {
    fontSize: 38,
    lineHeight: 48,
    fontFamily: fonts.headingBold,
    color: colors.text,
    letterSpacing: 6,
  },

  members: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },

  input: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 18,
    paddingVertical: 10,
    fontSize: 30,
    fontFamily: fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 14,
  },

  error: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: fonts.bodyBold,
    color: DANGER,
    textAlign: 'center',
    marginBottom: 12,
  },

  bigButton: {
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },

  bigButtonText: {
    color: '#fff',
    fontSize: 19,
    fontFamily: fonts.headingBold,
  },

  textButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },

  textButtonText: {
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});
