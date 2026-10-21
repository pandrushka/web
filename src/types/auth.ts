export type AuthMode = 'login' | 'register'
export type RegistrationProfile = { first_name: string; last_name: string; phone_number: string }

export type User = {
  id: number
  email: string
  role: string
  email_verified_at?: string | null
}

export type AuthResponse = {
  user: User
  access_token: string
  refresh_token: string
}

export type PendingVerificationResponse = {
  user: User
  status: 'pending_verification'
  message: string
}

export type RegisterResponse = {
  message: string
}

export type LoginResponse = AuthResponse | PendingVerificationResponse
