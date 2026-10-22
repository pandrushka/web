import { apiBaseUrl } from './client'
import { BoundedPromiseCache } from './boundedPromiseCache'
import { getApiLanguage } from '../i18n/apiLanguage'
import i18n from '../i18n'
import type { StorefrontCategory, StorefrontProduct, StorefrontStore } from '../features/storefront/types'

export type PublicProductsPage = {
  products: StorefrontProduct[]
  pagination: { page: number; per_page: number; total_count: number; total_pages: number }
}

export type PublicStoreSummary = Pick<StorefrontStore, 'name' | 'slug' | 'logo_initial' | 'description' | 'city'>
export type PublicStoreDirectoryPage = {
  stores: PublicStoreSummary[]
  pagination: PublicProductsPage['pagination']
}
export type PublicProductFilters = { q?: string; categoryId?: number | string | null }
export type PublicStoreDirectoryFilters = { q?: string; city?: string; page?: number; perPage?: number }

export class PublicStorefrontApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PublicStorefrontApiError'
    this.status = status
  }
}

const publicImageBlobCache = new BoundedPromiseCache<Blob>(48, 60_000)

async function requestPublicJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { 'Accept-Language': getApiLanguage() }, signal })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { error?: string; errors?: string[] }
    throw new PublicStorefrontApiError(errorBody.error ?? errorBody.errors?.join(', ') ?? i18n.t('errors.requestFailed', { ns: 'common', status: response.status }), response.status)
  }
  return response.json() as Promise<T>
}

function storePath(slug: string) {
  return `/api/v1/public/stores/${encodeURIComponent(slug)}`
}

export function fetchPublicStores(filters: PublicStoreDirectoryFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.city?.trim()) params.set('city', filters.city.trim())
  params.set('page', String(filters.page ?? 1))
  params.set('per_page', String(filters.perPage ?? 24))
  return requestPublicJson<PublicStoreDirectoryPage>(`/api/v1/public/stores?${params.toString()}`, signal)
}

export function fetchPublicStore(slug: string, signal?: AbortSignal) {
  return requestPublicJson<{ store: StorefrontStore }>(storePath(slug), signal)
}

export function fetchPublicCategories(slug: string, signal?: AbortSignal) {
  return requestPublicJson<{ categories: StorefrontCategory[] }>(`${storePath(slug)}/categories`, signal)
}

export function fetchPublicProducts(slug: string, page = 1, perPage = 24, filters: PublicProductFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.categoryId !== null && filters.categoryId !== undefined && String(filters.categoryId).trim()) params.set('category_id', String(filters.categoryId))
  return requestPublicJson<PublicProductsPage>(`${storePath(slug)}/products?${params.toString()}`, signal)
}

export function fetchPublicProduct(slug: string, productId: number | string, signal?: AbortSignal) {
  return requestPublicJson<{ product: StorefrontProduct }>(`${storePath(slug)}/products/${encodeURIComponent(String(productId))}`, signal)
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
