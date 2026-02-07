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

export interface TransactionItem {
  transactionId: string
  type: string
  memberId: string
  points: number
  rewardId?: string | null
  createdAt: string
}

export interface TransactionListResponse {
  transactions: TransactionItem[]
  nextToken?: string | null
}

export function listTransactions(
  tenantId: string,
  programId: string,
  options?: { memberId?: string; limit?: number; nextToken?: string },
  idToken?: string | null
): Promise<TransactionListResponse> {
  const params = new URLSearchParams()
  if (options?.memberId) params.set('memberId', options.memberId)
  if (options?.limit != null) params.set('limit', String(options.limit))
  if (options?.nextToken) params.set('nextToken', options.nextToken)
  const qs = params.toString()
  const path = `/api/v1/programs/${encodeURIComponent(programId)}/transactions${qs ? `?${qs}` : ''}`
  return apiGet<TransactionListResponse>(path, tenantId, idToken)
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
