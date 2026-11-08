import { useState, type PropsWithChildren } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { colors as theme, fonts, shadows } from '../theme'

export const colors = {
  night: '#FF923F',     // dark text on cream button
  panel: '#fb9c53',      // the orange input boxes
  line: '#7d5b3d',       // border of inputs
  text: theme.text,      // labels and headings
  muted: '#3b1c03',      //typing text colour
  placeholder: '#00000050', //colour in boxes
  gold: '#D55D00',       // focus colour and link orange
  error: '#b0241d',
  card: '#FFB67E',       // the big orange form panel
  cream: '#FFE2CB',      // the button
}

// The big rounded panel the form sits on
export function AuthCard({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  )
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
        <ActivityIndicator color={colors.gold} />
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
  },
  flex: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginBottom: 10,
  },
  notice: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 28,
  },
  switchText: { color: colors.text, fontSize: 16, fontFamily: fonts.headingBold },
  switchLink: { color: colors.gold, fontSize: 16, fontFamily: fonts.headingBold },
})

const styles = StyleSheet.create({
    card: {
    backgroundColor: colors.card,
    borderRadius: 36,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 22,
    ...shadows.inset,
  },
  cardTitle: {
    fontSize: 40,
    lineHeight: 35,
    fontFamily: fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  field: {
    marginBottom: 10,
  },
  label: {
  fontSize: 18,
  lineHeight: 15,
    fontFamily: fonts.headingBold,
  color: colors.text,
  marginBottom: 4,
  marginLeft: 14,
  },
  input: {
    backgroundColor: colors.panel,
    borderRadius: 30,
    height: 58,
    paddingHorizontal: 22,
    fontSize: 15,
    fontFamily: fonts.headingBold,
    color: colors.muted,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.inset,
  },
  inputFocused: {
    borderColor: colors.gold,
  },
  button: {
    backgroundColor: colors.cream,
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 44,
    alignSelf: 'center',
    marginTop: 12,
    ...shadows.raised,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { fontSize: 22, fontFamily: fonts.headingBold, color: colors.gold },
})