import { apiGet, apiPost, apiPut } from './client'

export interface Program {
  programId: string
  name: string
  currency: string
  earnRules?: Record<string, unknown>
  burnRules?: Record<string, unknown>
  tierConfig?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface ListProgramsResponse {
  programs: Program[]
}

export function listPrograms(tenantId: string, idToken?: string | null): Promise<ListProgramsResponse> {
  return apiGet<ListProgramsResponse>('/api/v1/programs', tenantId, idToken)
}

export function getProgram(tenantId: string, programId: string, idToken?: string | null): Promise<Program> {
  return apiGet<Program>(`/api/v1/programs/${programId}`, tenantId, idToken)
}

export function createProgram(
  tenantId: string,
  body: { name?: string; currency?: string },
  idToken?: string | null
): Promise<{ programId: string; name: string; currency: string }> {
  return apiPost(`/api/v1/programs`, tenantId, body, idToken)
}

export function updateProgram(
  tenantId: string,
  programId: string,
  body: { name?: string; currency?: string; earnRules?: object; burnRules?: object; tierConfig?: object },
  idToken?: string | null
): Promise<{ programId: string; updatedAt: string }> {
  return apiPut(`/api/v1/programs/${programId}`, tenantId, body, idToken)
}
