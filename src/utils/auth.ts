import type { User } from '../types/auth'

export function isPlatformAdmin(user: User) {
  return user.role === 'platform_admin' || user.role === 'super_admin'
}
