import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'

// Deep navy with an Iron Man gold accent. Change these to match your team's design.
export const colors = {
  night: '#0F1B2D',
  panel: '#172741',
  line: '#2A3D5C',
  text: '#EEF2F7',
  muted: '#8FA2BC',
  placeholder: '#5E7190',
  gold: '#F2B33D',
  error: '#FF8A7A',
}

// A labeled text box that lights up gold when you tap into it
type AuthFieldProps = TextInputProps & { label: string }

export function AuthField({ label, style, onFocus, onBlur, ...inputProps }: AuthFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        {...inputProps}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        style={[styles.input, focused && styles.inputFocused, style]}
      />
    </View>
  )
}

// The main gold button, shows a spinner while loading
type AuthButtonProps = {
  title: string
  onPress: () => void
  loading?: boolean
}

export function AuthButton({ title, onPress, loading = false }: AuthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        loading && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.night} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  )
}

// Screen-level styles used by sign-in.tsx and sign-up.tsx
export const authStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  wordmark: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    color: colors.text,
  },
  tagline: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 40,
  },
  error: {
    color: colors.error,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 14,
  },
  notice: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 28,
  },
  switchText: {
    color: colors.muted,
    fontSize: 15,
  },
  switchLink: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },
})

const styles = StyleSheet.create({
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.gold,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.night,
  },
})