import { apiRequest } from './client'
import type { AuthResponse, LoginResponse, RegisterResponse } from '../types/auth'

export function register(email: string, password: string, turnstileToken: string | null) {
  return apiRequest<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, turnstile_token: turnstileToken }),
  })
}

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function resendVerificationEmail(email: string) {
  return apiRequest<{ message: string }>('/api/v1/auth/resend_verification_email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function refreshAuth(refreshToken: string) {
  return apiRequest<{ access_token: string }>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export function verifyEmail(token: string) {
  return apiRequest<AuthResponse>('/api/v1/auth/verify_email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
