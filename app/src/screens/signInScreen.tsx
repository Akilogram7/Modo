import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { AuthButton, AuthField, authStyles } from '../components/auth-ui'

type Props = {
  onSwitchToSignUp: () => void
}

export default function SignInScreen({ onSwitchToSignUp }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <View style={authStyles.screen}>
      <KeyboardAvoidingView
        style={authStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={authStyles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={authStyles.wordmark}>Modo</Text>
          <Text style={authStyles.tagline}>Log in to get back to your modes.</Text>

          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <AuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={handleSignIn}
          />

          {error && <Text style={authStyles.error}>{error}</Text>}

          <AuthButton title="Log in" onPress={handleSignIn} loading={loading} />

          <View style={authStyles.switchRow}>
            <Text style={authStyles.switchText}>New to Modo? </Text>
            <Pressable onPress={onSwitchToSignUp} accessibilityRole="link" hitSlop={8}>
              <Text style={authStyles.switchLink}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}