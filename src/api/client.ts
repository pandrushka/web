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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const retryAfterHeader = Number(response.headers.get('Retry-After'))
    const retryAfterSeconds = Number(errorBody.retry_after_seconds ?? retryAfterHeader) || undefined
    throw new ApiRequestError(
      errorBody.error ?? errorBody.errors?.join(', ') ?? `Request failed with ${response.status}`,
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
