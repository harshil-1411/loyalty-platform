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

export interface AuthUser {
  username: string
  email?: string
  sub: string
}

function parseIdTokenPayload(idToken: string): AuthUser {
  const payload = JSON.parse(atob(idToken.split('.')[1]))
  return {
    username: payload['cognito:username'] ?? payload.sub,
    email: payload.email,
    sub: payload.sub,
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
  const pool = getPool()
  const user = pool.getCurrentUser()
  if (user) {
    user.signOut()
  }
}

export function getIdToken(): Promise<string | null> {
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
