import { config } from '../config'

const baseUrl = () => config.api.baseUrl

export function getApiHeaders(tenantId: string, idToken?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenantId,
  }
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`
  return headers
}

export async function apiGet<T>(path: string, tenantId: string, idToken?: string | null): Promise<T> {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'GET',
    headers: getApiHeaders(tenantId, idToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function apiPost<T>(path: string, tenantId: string, body: unknown, idToken?: string | null): Promise<T> {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'POST',
    headers: getApiHeaders(tenantId, idToken),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function apiPut<T>(path: string, tenantId: string, body: unknown, idToken?: string | null): Promise<T> {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: getApiHeaders(tenantId, idToken),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function apiPatch<T>(path: string, tenantId: string, body: unknown, idToken?: string | null): Promise<T> {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getApiHeaders(tenantId, idToken),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error?.message || err.error || res.statusText)
  }
  return res.json()
}

export async function apiDelete(path: string, tenantId: string, idToken?: string | null): Promise<void> {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getApiHeaders(tenantId, idToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
}
