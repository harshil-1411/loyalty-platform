import { apiGet, apiPost } from './client'

export interface Reward {
  rewardId: string
  name: string
  pointsCost: number
  tierEligibility?: string | null
}

export interface ListRewardsResponse {
  rewards: Reward[]
}

export function listRewards(
  tenantId: string,
  programId: string,
  idToken?: string | null
): Promise<ListRewardsResponse> {
  return apiGet<ListRewardsResponse>(
    `/api/v1/programs/${programId}/rewards`,
    tenantId,
    idToken
  )
}

export function createReward(
  tenantId: string,
  programId: string,
  body: { name: string; pointsCost: number },
  idToken?: string | null
): Promise<{ rewardId: string; name: string; pointsCost: number }> {
  return apiPost(
    `/api/v1/programs/${programId}/rewards`,
    tenantId,
    body,
    idToken
  )
}

export interface RedeemResponse {
  transactionId: string
  rewardId: string
  pointsDeducted: number
  balance: number
}

export function redeem(
  tenantId: string,
  programId: string,
  body: { memberId: string; rewardId: string },
  idToken?: string | null
): Promise<RedeemResponse> {
  return apiPost<RedeemResponse>(
    `/api/v1/programs/${programId}/redeem`,
    tenantId,
    body,
    idToken
  )
}
