import { apiPatch } from './client'

export interface SetTenantResponse {
  tenantId: string
  updated: boolean
}

export function setMyTenant(
  tenantId: string,
  body: { tenantId: string },
  idToken?: string | null
): Promise<SetTenantResponse> {
  return apiPatch<SetTenantResponse>('/api/v1/me/tenant', tenantId, body, idToken)
}
