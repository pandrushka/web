import { apiBaseUrl } from './client'
import { BoundedPromiseCache } from './boundedPromiseCache'
import { getApiLanguage } from '../i18n/apiLanguage'
import i18n from '../i18n'
import type { StorefrontCategory, StorefrontProduct, StorefrontStore } from '../features/storefront/types'

export type PublicProductsPage = {
  products: StorefrontProduct[]
  pagination: { page: number; per_page: number; total_count: number; total_pages: number }
}

export class PublicStorefrontApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PublicStorefrontApiError'
    this.status = status
  }
}

const publicImageBlobCache = new BoundedPromiseCache<Blob>(48, 60_000)

async function requestPublicJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { 'Accept-Language': getApiLanguage() } })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { error?: string; errors?: string[] }
    throw new PublicStorefrontApiError(errorBody.error ?? errorBody.errors?.join(', ') ?? i18n.t('errors.requestFailed', { ns: 'common', status: response.status }), response.status)
  }
  return response.json() as Promise<T>
}

function storePath(slug: string) {
  return `/api/v1/public/stores/${encodeURIComponent(slug)}`
}

export function fetchPublicStore(slug: string) {
  return requestPublicJson<{ store: StorefrontStore }>(storePath(slug))
}

export function fetchPublicCategories(slug: string) {
  return requestPublicJson<{ categories: StorefrontCategory[] }>(`${storePath(slug)}/categories`)
}

export function fetchPublicProducts(slug: string, page = 1, perPage = 24) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  return requestPublicJson<PublicProductsPage>(`${storePath(slug)}/products?${params.toString()}`)
}

export async function fetchPublicProductImage(path: string) {
  return publicImageBlobCache.getOrLoad(`${apiBaseUrl}:${path}`, async () => {
    const response = await fetch(`${apiBaseUrl}${path}`, { headers: { 'Accept-Language': getApiLanguage() } })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as { error?: string; errors?: string[] }
      throw new PublicStorefrontApiError(errorBody.error ?? errorBody.errors?.join(', ') ?? i18n.t('errors.requestFailed', { ns: 'common', status: response.status }), response.status)
    }
    return response.blob()
  })
}
