export type AuthMode = 'login' | 'register'

export type User = {
  id: number
  email: string
  role: string
}

export type AuthResponse = {
  user: User
  access_token: string
  refresh_token: string
}
