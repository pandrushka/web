export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

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
    throw new Error(errorBody.error ?? errorBody.errors?.join(', ') ?? `Request failed with ${response.status}`)
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export function authorizationHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}
