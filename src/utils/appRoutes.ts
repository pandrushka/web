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
