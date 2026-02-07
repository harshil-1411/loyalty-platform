/**
 * Runtime config from Vite env (VITE_*). Set at build time or in .env.
 */
export const config = {
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
  },
  api: {
    baseUrl: (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, ''),
  },
} as const

export function isAuthConfigured(): boolean {
  return Boolean(config.cognito.userPoolId && config.cognito.clientId)
}
