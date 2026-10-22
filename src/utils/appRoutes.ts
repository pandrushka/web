const reservedRootSegments = new Set([
  'admin', 'api', 'assets', 'auth', 'invite', 'login', 'manage', 'me', 'onboarding', 'rails', 'register',
  'store_invitations', 'stores', 'up', 'verify-email',
])

export function publicStoreSlugFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return null

  let slug: string
  try {
    slug = decodeURIComponent(segments[0])
  } catch {
    return null
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || reservedRootSegments.has(slug)) return null
  return slug
}

export function publicProductRouteFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 3 || segments[1] !== 'products' || !/^[1-9]\d*$/.test(segments[2])) return null
  const slug = publicStoreSlugFromPath(`/${segments[0]}`)
  return slug ? { slug, productId: segments[2] } : null
}

export function isPublicStoreDirectoryPath(pathname: string) {
  return pathname.replace(/\/+$/, '') === '/stores'
}
