import type { User } from '../types/auth'

export function isAdmin(user: User) {
  return user.role === 'admin' || user.role === 'super_admin'
}

export function isSuperAdmin(user: User) {
  return user.role === 'super_admin'
}
