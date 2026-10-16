import { apiBaseUrl, apiRequest, authorizationHeaders } from './client'
import { BoundedPromiseCache } from './boundedPromiseCache'
import type { CatalogProduct } from './catalog'

export type ImageTokenRefresh = (expiredAccessToken: string) => Promise<string>

const imageBlobCache = new BoundedPromiseCache<Blob>(48)
const IMAGE_INVALIDATED_EVENT = 'store-platform:product-image-invalidated'

function imageCacheKey(cacheScope: string, path: string) {
  return `${apiBaseUrl}:${cacheScope}:${path}`
}

async function requestImageBlob(path: string, accessToken: string, refreshAccessToken?: ImageTokenRefresh) {
  let response = await fetch(`${apiBaseUrl}${path}`, { headers: authorizationHeaders(accessToken) })
  if (response.status === 401 && refreshAccessToken) {
    const refreshedToken = await refreshAccessToken(accessToken)
    response = await fetch(`${apiBaseUrl}${path}`, { headers: authorizationHeaders(refreshedToken) })
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { error?: string; errors?: string[] }
    throw new Error(errorBody.error ?? errorBody.errors?.join(', ') ?? `Image request failed with ${response.status}`)
  }
  return response.blob()
}

export function fetchProductImage(path: string, accessToken: string, cacheScope: string, refreshAccessToken?: ImageTokenRefresh) {
  const key = imageCacheKey(cacheScope, path)
  return imageBlobCache.getOrLoad(key, () => requestImageBlob(path, accessToken, refreshAccessToken))
}

export function invalidateProductImage(path: string, cacheScope?: string) {
  const suffix = `:${path}`
  const scopeMarker = cacheScope ? `:${cacheScope}${suffix}` : suffix
  imageBlobCache.deleteWhere((key) => key.endsWith(scopeMarker))
  window.dispatchEvent(new CustomEvent(IMAGE_INVALIDATED_EVENT, { detail: { path, cacheScope } }))
}

export function uploadProductImage(accessToken: string, storeId: number, productId: number, image: File) {
  const form = new FormData()
  form.append('image', image)
  return apiRequest<{ product: Pick<CatalogProduct, 'id' | 'image'> }>(`/api/v1/stores/${storeId}/products/${productId}/image`, {
    method: 'PUT',
    headers: authorizationHeaders(accessToken),
    body: form,
  }).then((result) => {
    invalidateProductImage(`/api/v1/stores/${storeId}/products/${productId}/image`)
    return result
  })
}

export function removeProductImage(accessToken: string, storeId: number, productId: number) {
  return apiRequest<{ product: Pick<CatalogProduct, 'id' | 'image'> }>(`/api/v1/stores/${storeId}/products/${productId}/image`, {
    method: 'DELETE',
    headers: authorizationHeaders(accessToken),
  }).then((result) => {
    invalidateProductImage(`/api/v1/stores/${storeId}/products/${productId}/image`)
    return result
  })
}

export function clearProductImageCache() {
  imageBlobCache.clear()
}

export function onProductImageInvalidated(listener: (detail: { path: string; cacheScope?: string }) => void) {
  const handleEvent = (event: Event) => listener((event as CustomEvent<{ path: string; cacheScope?: string }>).detail)
  window.addEventListener(IMAGE_INVALIDATED_EVENT, handleEvent)
  return () => window.removeEventListener(IMAGE_INVALIDATED_EVENT, handleEvent)
}

export function productImageCacheSize() {
  return imageBlobCache.size
}
