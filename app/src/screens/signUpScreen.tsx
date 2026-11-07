import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { AuthButton, AuthCard, AuthField, authStyles } from '../components/auth-ui'
import AuthBackground from '../components/AuthBackground'

type Props = {
  onSwitchToSignIn: () => void
}

export default function SignUpScreen({ onSwitchToSignIn }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSignUp() {
    setError(null)
    setNotice(null)

    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in your name, email and password.')
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Extra info saved on the user, you can read it later as user.user_metadata.display_name
        data: { display_name: name.trim() },
      },
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // If "Confirm email" is ON in Supabase, there's no session until they click the email link
    if (!data.session) {
      setNotice(`Check ${email.trim()} for a link to confirm your account, then log in.`)
    }

    // If "Confirm email" is OFF, they're logged in right away and
    // AuthGate moves them into the app automatically.
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
        <AuthCard title="CREATE ACCOUNT">
          <AuthField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="What should Modo call you?"
            autoComplete="name"
            textContentType="name"
          />

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
            placeholder="choose wisely"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <AuthField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="don't forget it"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={handleSignUp}
          />

          {error && <Text style={authStyles.error}>{error}</Text>}
          {notice && <Text style={authStyles.notice}>{notice}</Text>}

          <AuthButton title="WELCOME!" onPress={handleSignUp} loading={loading} />

          <View style={authStyles.switchRow}>
            <Text style={authStyles.switchText}>Already been here before? </Text>
            <Pressable onPress={onSwitchToSignIn} accessibilityRole="link" hitSlop={8}>
              <Text style={authStyles.switchLink}>Log In!</Text>
            </Pressable>
          </View>
        </AuthCard>
      </ScrollView>
    </KeyboardAvoidingView>
  </AuthBackground>
)
}