import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { backgroundColors, colors, fonts, shadows } from '../../assets/theme';

// Shown on the Profile tab for guests: turns the guest account into a normal one
// by adding an email and password. Everything they made stays, because it's the same account.
//
// How Supabase does it:
//   1. Add the email (updateUser with email)
//   2. If the project asks people to confirm their email, they tap the link in the email
//      (or type the 6 digit code, if the email has one)
//   3. Then the password can be added (updateUser with password)

const GREEN = backgroundColors[3];

export default function GuestUpgradeCard() {
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanEmail = email.trim().toLowerCase();

  async function addPassword() {
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setError(passwordError.message);
      return;
    }
    Alert.alert('Account saved!', `You can now log in with ${cleanEmail} on any phone.`);
  }

  async function saveAccount() {
    setError(null);
    if (!cleanEmail.includes('@')) {
      setError('Enter your email.');
      return;
    }
    if (password.length < 6) {
      setError('Your password needs at least 6 characters.');
      return;
    }

    setBusy(true);
    const { data, error: emailError } = await supabase.auth.updateUser({ email: cleanEmail });
    if (emailError) {
      setBusy(false);
      setError(emailError.message);
      return;
    }

    // Email saved right away (email confirmation is off) -> add the password now
    if (data.user?.email?.toLowerCase() === cleanEmail) {
      await addPassword();
    } else {
      setStep('confirm');
    }
    setBusy(false);
  }

  async function confirmed() {
    setError(null);
    setBusy(true);

    if (code.trim()) {
      const { error: codeError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: code.trim(),
        type: 'email_change',
      });
      if (codeError) {
        setBusy(false);
        setError(codeError.message);
        return;
      }
    } else {
      // They tapped the link in the email: check with Supabase that it worked
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || data.user?.email?.toLowerCase() !== cleanEmail) {
        setBusy(false);
        setError("Your email isn't confirmed yet. Tap the link in the email first.");
        return;
      }
      await supabase.auth.refreshSession();
    }

    await addPassword();
    setBusy(false);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{"You're using a guest account"}</Text>

      {step === 'form' ? (
        <>
          <Text style={styles.body}>
            {"Your modes and stats are saved, but only to this guest account. If you log out or lose this phone, they're gone. Add an email to keep them."}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#A89A94"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (6+ characters)"
            placeholderTextColor="#A89A94"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            style={styles.input}
            onSubmitEditing={saveAccount}
          />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            We sent an email to {cleanEmail}. Tap the link in it, then come back and tap the button
            below. If the email has a 6 digit code instead, type it here.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="6 digit code (if you got one)"
            placeholderTextColor="#A89A94"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={step === 'form' ? saveAccount : confirmed}
        disabled={busy}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {step === 'form' ? 'Save my account' : "I've confirmed my email"}
          </Text>
        )}
      </Pressable>

      {step === 'confirm' && (
        <Pressable
          onPress={() => {
            setStep('form');
            setCode('');
            setError(null);
          }}
          style={styles.linkButton}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Use a different email</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: '#fff6f3',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 10,
    ...shadows.raised,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.headingBold,
    color: colors.heading,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fonts.bodyBold,
    color: colors.otherText,
  },
  input: {
    borderWidth: 1.5,
    borderColor: backgroundColors[0],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
    fontFamily: fonts.bodyBold,
    color: colors.otherText,
  },
  error: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: fonts.bodyBold,
    color: backgroundColors[10],
  },
  button: {
    height: 52,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fonts.headingBold,
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
    color: colors.otherText,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});
