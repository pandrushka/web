import { describe, expect, it } from 'vitest'
import { publicStoreSlugFromPath } from './appRoutes'

describe('publicStoreSlugFromPath', () => {
  it('recognizes one URL-safe store slug, including a trailing slash', () => {
    expect(publicStoreSlugFromPath('/pulperia-estrada')).toBe('pulperia-estrada')
    expect(publicStoreSlugFromPath('/tienda-maria/')).toBe('tienda-maria')
  })

  it.each([
    '/', '/invite/token', '/invite', '/login', '/register', '/manage', '/manage/stores', '/admin', '/admin/stores',
    '/api', '/auth/callback', '/verify-email', '/onboarding', '/stores', '/favicon.svg', '/Uppercase', '/bad%2Fslug',
  ])('does not treat protected or invalid route %s as a public store', (path) => {
    expect(publicStoreSlugFromPath(path)).toBeNull()
  })
})
