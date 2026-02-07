import { apiGet, apiPost } from './client'

export interface BalanceResponse {
  memberId: string
  programId: string
  balance: number
}

export interface EarnBurnResponse {
  transactionId: string
  balance: number
  points: number
}

export function getBalance(
  tenantId: string,
  programId: string,
  memberId: string,
  idToken?: string | null
): Promise<BalanceResponse> {
  return apiGet<BalanceResponse>(
    `/api/v1/programs/${programId}/balance/${encodeURIComponent(memberId)}`,
    tenantId,
    idToken
  )
}

export function earn(
  tenantId: string,
  programId: string,
  body: { memberId: string; points: number; idempotencyKey?: string },
  idToken?: string | null
): Promise<EarnBurnResponse> {
  return apiPost<EarnBurnResponse>(
    `/api/v1/programs/${programId}/earn`,
    tenantId,
    body,
    idToken
  )
}

export function burn(
  tenantId: string,
  programId: string,
  body: { memberId: string; points: number },
  idToken?: string | null
): Promise<EarnBurnResponse> {
  return apiPost<EarnBurnResponse>(
    `/api/v1/programs/${programId}/burn`,
    tenantId,
    body,
    idToken
  )
}
