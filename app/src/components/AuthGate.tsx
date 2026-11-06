import { useEffect, useState, type PropsWithChildren } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../providers/AuthProvider'
import SignInScreen from '../screens/signInScreen'
import SignUpScreen from '../screens/signUpScreen'
import { colors } from './auth-ui'

// Shows the login / sign up screens when nobody is logged in,
// and your real app (whatever you wrap inside AuthGate) when someone is.
export function AuthGate({ children }: PropsWithChildren) {
  const { session, isLoading } = useAuth()
  const [showSignUp, setShowSignUp] = useState(false)

  // After loggin in, let logging out lead to the log out screen
  useEffect(() => {
    if (session) setShowSignUp(false)
  }, [session])

  // check if someone is logged in
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.night,
        }}
      >
        <ActivityIndicator color={colors.gold} />
      </View>
    )
  }

  if (!session) {
    return showSignUp ? (
      <SignUpScreen onSwitchToSignIn={() => setShowSignUp(false)} />
    ) : (
      <SignInScreen onSwitchToSignUp={() => setShowSignUp(true)} />
    )
  }

  return <>{children}</>
}