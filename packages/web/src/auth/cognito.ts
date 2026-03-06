import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type ISignUpResult,
} from 'amazon-cognito-identity-js'
import { config, isAuthConfigured } from '../config'

let userPool: CognitoUserPool | null = null

function getPool(): CognitoUserPool {
  if (!userPool) {
    if (!isAuthConfigured()) {
      throw new Error('Cognito is not configured (missing VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_CLIENT_ID)')
    }
    userPool = new CognitoUserPool({
      UserPoolId: config.cognito.userPoolId,
      ClientId: config.cognito.clientId,
    })
  }
  return userPool
}

export type UserRole = 'tenant_admin' | 'super_admin'

export interface AuthUser {
  username: string
  email?: string
  sub: string
  /** From Cognito custom attribute; used as tenant for API calls. */
  custom_tenant_id?: string
  /** Derived from cognito:groups or dev override. */
  role: UserRole
}

function parseIdTokenPayload(idToken: string): AuthUser {
  const payload = JSON.parse(atob(idToken.split('.')[1]))
  const groups: string[] = payload['cognito:groups'] ?? []
  return {
    username: payload['cognito:username'] ?? payload.sub,
    email: payload.email,
    sub: payload.sub,
    custom_tenant_id: payload['custom:tenant_id'],
    role: groups.includes('super_admin') ? 'super_admin' : 'tenant_admin',
  }
}

export function getCurrentUser(): Promise<CognitoUser | null> {
  return new Promise((resolve) => {
    if (!isAuthConfigured()) {
      resolve(null)
      return
    }
    const pool = getPool()
    const user = pool.getCurrentUser()
    if (!user) {
      resolve(null)
      return
    }
    user.getSession((err: Error | null) => {
      if (err) {
        resolve(null)
        return
      }
      resolve(user)
    })
  })
}

export function getSessionUser(): Promise<AuthUser | null> {
  return getCurrentUser().then((user) => {
    if (!user) return null
    return new Promise((resolve) => {
      user.getSession((err: Error | null, session: { getIdToken: () => { getJwtToken: () => string } } | null) => {
        if (err || !session) {
          resolve(null)
          return
        }
        const idToken = session.getIdToken().getJwtToken()
        resolve(parseIdTokenPayload(idToken))
      })
    })
  })
}

export function signIn(username: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const pool = getPool()
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    })
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: pool,
    })
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken()
        resolve(parseIdTokenPayload(idToken))
      },
      onFailure: (err) => reject(err),
    })
  })
}

export interface SignUpInput {
  username: string
  email: string
  password: string
}

export function signUp(input: SignUpInput): Promise<ISignUpResult> {
  return new Promise((resolve, reject) => {
    const pool = getPool()
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: input.email }),
      new CognitoUserAttribute({ Name: 'preferred_username', Value: input.username }),
    ]
    pool.signUp(input.username, input.password, attributes, [], (err, result) => {
      if (err) reject(err)
      else if (result) resolve(result)
      else reject(new Error('SignUp returned no result'))
    })
  })
}

export function confirmSignUp(username: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool()
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: pool,
    })
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function signOut(): void {
  clearSsoSession()
  sessionStorage.removeItem(SSO_WAS_ACTIVE_KEY) // Explicit logout = clean slate
  const pool = getPool()
  const user = pool.getCurrentUser()
  if (user) {
    user.signOut()
  }
}

export function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  return getCurrentUser().then((user) => {
    if (!user) return Promise.reject(new Error('Not authenticated'))
    return new Promise<void>((resolve, reject) => {
      user.getSession((err: Error | null, session: unknown) => {
        if (err || !session) return reject(err ?? new Error('No session'))
        user.changePassword(oldPassword, newPassword, (e) => {
          if (e) reject(e)
          else resolve()
        })
      })
    })
  })
}

export function forgotPassword(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool()
    const cognitoUser = new CognitoUser({ Username: username, Pool: pool })
    cognitoUser.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

export function confirmForgotPassword(
  username: string,
  code: string,
  newPassword: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool()
    const cognitoUser = new CognitoUser({ Username: username, Pool: pool })
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

export function getIdToken(): Promise<string | null> {
  // SSO session takes priority (tab-scoped via sessionStorage)
  const sso = getSsoSession()
  if (sso) return Promise.resolve(sso.idToken)

  return getCurrentUser().then((user) => {
    if (!user) return null
    return new Promise((resolve) => {
      user.getSession((err: Error | null, session: { getIdToken: () => { getJwtToken: () => string } } | null) => {
        if (err || !session) resolve(null)
        else resolve(session.getIdToken().getJwtToken())
      })
    })
  })
}

// ── SSO Session (tab-scoped via sessionStorage) ──────────────────────────────

const SSO_TOKEN_KEY = 'lp_sso_token'
const SSO_WAS_ACTIVE_KEY = 'lp_sso_was_active'

/**
 * Initialize an SSO session from a Cognito ID token received via URL.
 * Stores the token in sessionStorage (per-tab) so it doesn't interfere
 * with normal Cognito SDK sessions in localStorage.
 */
export function initFromSsoToken(idToken: string): AuthUser | null {
  try {
    const user = parseIdTokenPayload(idToken)
    sessionStorage.setItem(SSO_TOKEN_KEY, idToken)
    sessionStorage.setItem(SSO_WAS_ACTIVE_KEY, 'true')
    return user
  } catch {
    return null
  }
}

/**
 * Read the current SSO session from sessionStorage.
 * Returns null if no session exists or the token has expired.
 */
export function getSsoSession(): { user: AuthUser; idToken: string } | null {
  const idToken = sessionStorage.getItem(SSO_TOKEN_KEY)
  if (!idToken) return null

  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]))
    // Check expiry (exp is in seconds)
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearSsoSession()
      return null
    }
    return { user: parseIdTokenPayload(idToken), idToken }
  } catch {
    clearSsoSession()
    return null
  }
}

/** Clear SSO session data from sessionStorage. */
export function clearSsoSession(): void {
  sessionStorage.removeItem(SSO_TOKEN_KEY)
  // Keep SSO_WAS_ACTIVE_KEY so ProtectedLayout can show the right message
}

/** Check if this tab was previously an SSO session (for expiry messaging). */
export function wasSsoSession(): boolean {
  return sessionStorage.getItem(SSO_WAS_ACTIVE_KEY) === 'true'
}
