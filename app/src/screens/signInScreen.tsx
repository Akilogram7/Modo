import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { AuthButton, AuthCard, AuthField, authStyles, colors } from '../components/auth-ui'
import AuthBackground from '../components/AuthBackground'

type Props = {
  onSwitchToSignUp: () => void
}

export default function SignInScreen({ onSwitchToSignUp }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestLoading, setGuestLoading] = useState(false)

  async function handleSignIn() {
    setError(null)

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
    }

    // No navigation here on purpose. When the login works, AuthProvider gets
    // the new session and AuthGate switches to the main app by itself.
  }

  // Try the app without an email. Supabase makes a real (but anonymous) account,
  // so modes and stats save like normal. They can add an email later on the Profile tab.
  async function handleGuest() {
    setError(null)
    setGuestLoading(true)
    const { error: guestError } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: 'Guest' } },
    })
    setGuestLoading(false)

    if (guestError) {
      setError(
        /disabled/i.test(guestError.message)
          ? 'Guest accounts are turned off right now. Create an account instead.'
          : guestError.message,
      )
    }
  }

return (
  <AuthBackground>
    <KeyboardAvoidingView
      style={authStyles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[authStyles.inner, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AuthCard title="WELCOME">
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="modo@modo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <AuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Shh..."
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={handleSignIn}
          />

          {error && <Text style={authStyles.error}>{error}</Text>}

          <AuthButton title="LOG IN" onPress={handleSignIn} loading={loading} />

          <View style={authStyles.switchRow}>
            <Text style={authStyles.switchText}>New here? </Text>
            <Pressable onPress={onSwitchToSignUp} accessibilityRole="link" hitSlop={8}>
              <Text style={authStyles.switchLink}>Create an account!</Text>
            </Pressable>
          </View>

          <View style={authStyles.switchRow}>
            <Text style={authStyles.switchText}>Just looking? </Text>
            {guestLoading ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <Pressable onPress={handleGuest} accessibilityRole="button" hitSlop={8}>
                <Text style={authStyles.switchLink}>Continue as a guest</Text>
              </Pressable>
            )}
          </View>
        </AuthCard>
      </ScrollView>
    </KeyboardAvoidingView>
  </AuthBackground>
)
}