import type { AuthResponse } from '../types/auth'

const authSessionKey = 'forme.auth.session'

export function loadAuthSession() {
  const rawSession = window.localStorage.getItem(authSessionKey)
  if (!rawSession) return null

  try {
    return JSON.parse(rawSession) as AuthResponse
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthResponse) {
  window.localStorage.setItem(authSessionKey, JSON.stringify(session))
}

export function clearAuthSession() {
  window.localStorage.removeItem(authSessionKey)
}
