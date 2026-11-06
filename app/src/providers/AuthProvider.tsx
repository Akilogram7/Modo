import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. On app open, check if a login was saved on the phone from last time
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    // 2. After that, update whenever someone logs in, logs out, or the token refreshes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    // Stop listening if this component ever unmounts
    return () => subscription.unsubscribe()
  }, [])
 // sign out
  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Use this in any screen: const { user, signOut } = useAuth()
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth has to be used inside <AuthProvider>')
  }
  return context
}