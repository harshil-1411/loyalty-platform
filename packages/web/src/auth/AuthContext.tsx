import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from './cognito'
import { config, isAuthConfigured } from '../config'
import {
  getSessionUser,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
  initFromSsoToken,
  getSsoSession,
  wasSsoSession,
} from './cognito'

/** Mock super-admin identity used when VITE_SUPER_ADMIN_MODE=true */
const MOCK_SUPER_ADMIN: AuthUser = {
  username: 'superadmin',
  email: 'admin@loyaltyplatform.dev',
  sub: 'sa-00000000-0000-0000-0000-000000000000',
  role: 'super_admin',
}

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
    // Dev super-admin bypass — skip Cognito entirely
    if (config.superAdmin.devMode) {
      setState({ status: 'authenticated', user: MOCK_SUPER_ADMIN })
      return
    }
    if (!isAuthConfigured()) {
      setState({ status: 'disabled', reason: 'Auth not configured' })
      return
    }

    // 1. Check URL for SSO token (first load from salon dashboard redirect)
    const params = new URLSearchParams(window.location.search)
    const ssoToken = params.get('sso_token')
    if (ssoToken) {
      const ssoUser = initFromSsoToken(ssoToken)
      if (ssoUser) {
        // Clean the token from URL without triggering a reload
        params.delete('sso_token')
        const clean = params.toString()
        const newUrl = window.location.pathname + (clean ? `?${clean}` : '') + window.location.hash
        window.history.replaceState({}, '', newUrl)
        setState({ status: 'authenticated', user: ssoUser })
        return
      }
    }

    // 2. Check sessionStorage for existing SSO session (tab refresh)
    const ssoSession = getSsoSession()
    if (ssoSession) {
      setState({ status: 'authenticated', user: ssoSession.user })
      return
    }

    // 2b. If this was an SSO tab but the token expired, do NOT fall through
    // to Cognito SDK (could be a different user like super admin)
    if (wasSsoSession()) {
      setState({ status: 'unauthenticated' })
      return
    }

    // 3. Fall through to normal Cognito SDK session
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
