import { describe, expect, it } from 'vitest'
import { isPublicStoreDirectoryPath, publicProductRouteFromPath, publicStoreSlugFromPath } from './appRoutes'

describe('publicStoreSlugFromPath', () => {
  it('recognizes one URL-safe store slug, including a trailing slash', () => {
    expect(publicStoreSlugFromPath('/pulperia-estrada')).toBe('pulperia-estrada')
    expect(publicStoreSlugFromPath('/tienda-maria/')).toBe('tienda-maria')
  })

  it.each([
    '/', '/invite/token', '/invite', '/login', '/register', '/manage', '/manage/stores', '/admin', '/admin/stores',
    '/api', '/auth/callback', '/verify-email', '/onboarding', '/stores', '/favicon.ico', '/Uppercase', '/bad%2Fslug',
  ])('does not treat protected or invalid route %s as a public store', (path) => {
    expect(publicStoreSlugFromPath(path)).toBeNull()
  })

  it('recognizes public product detail routes without matching reserved route segments', () => {
    expect(publicProductRouteFromPath('/pulperia-estrada/products/42')).toEqual({ slug: 'pulperia-estrada', productId: '42' })
    expect(publicProductRouteFromPath('/stores/products/42')).toBeNull()
    expect(publicProductRouteFromPath('/invite/products/42')).toBeNull()
    expect(publicProductRouteFromPath('/tienda/products/not-an-id')).toBeNull()
  })

  it('reserves the public store directory path and its trailing slash', () => {
    expect(isPublicStoreDirectoryPath('/stores')).toBe(true)
    expect(isPublicStoreDirectoryPath('/stores/')).toBe(true)
    expect(isPublicStoreDirectoryPath('/tienda/stores')).toBe(false)
  })
})
