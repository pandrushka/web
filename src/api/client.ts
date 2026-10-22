import { getApiLanguage } from '../i18n/apiLanguage'
import i18n from '../i18n'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export class ApiRequestError extends Error {
  readonly status: number
  readonly retryAfterSeconds?: number

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const headers = new Headers(init.headers)
  if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  headers.set('Accept-Language', getApiLanguage())

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const retryAfterHeader = Number(response.headers.get('Retry-After'))
    const retryAfterSeconds = Number(errorBody.retry_after_seconds ?? retryAfterHeader) || undefined
    throw new ApiRequestError(
      errorBody.error ?? errorBody.errors?.join(', ') ?? i18n.t('errors.requestFailed', { ns: 'common', status: response.status }),
      response.status,
      retryAfterSeconds,
    )
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export function authorizationHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}
