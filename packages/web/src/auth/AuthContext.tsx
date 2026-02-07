import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from './cognito'
import { isAuthConfigured } from '../config'
import {
  getSessionUser,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
} from './cognito'

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'disabled'; reason: string }

interface AuthContextValue {
  state: AuthState
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, email: string, password: string) => Promise<void>
  confirmSignUp: (username: string, code: string) => Promise<void>
  signOut: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const refresh = useCallback(async () => {
    if (!isAuthConfigured()) {
      setState({ status: 'disabled', reason: 'Auth not configured' })
      return
    }
    const user = await getSessionUser()
    if (user) {
      setState({ status: 'authenticated', user })
    } else {
      setState({ status: 'unauthenticated' })
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { void refresh() }, 0)
    return () => clearTimeout(t)
  }, [refresh])

  const signIn = useCallback(
    async (username: string, password: string) => {
      const user = await cognitoSignIn(username, password)
      setState({ status: 'authenticated', user })
    },
    []
  )

  const signUp = useCallback(
    async (username: string, email: string, password: string) => {
      await cognitoSignUp({ username, email, password })
      // Stay on sign-up flow; user must confirm. Don't set authenticated.
    },
    []
  )

  const confirmSignUp = useCallback(async (username: string, code: string) => {
    await cognitoConfirmSignUp(username, code)
    await refresh()
  }, [refresh])

  const signOut = useCallback(() => {
    cognitoSignOut()
    setState({ status: 'unauthenticated' })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn,
      signUp,
      confirmSignUp,
      signOut,
      refresh,
    }),
    [state, signIn, signUp, confirmSignUp, signOut, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
