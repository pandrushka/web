import { apiRequest, authorizationHeaders } from './client'

export const PRODUCT_UNITS = ['unidad', 'libra', 'kilogramo', 'gramo', 'litro', 'paquete', 'docena'] as const
export type ProductUnit = typeof PRODUCT_UNITS[number]

export type CatalogCategory = {
  id: number
  name: string
  position: number
  active: boolean
  created_at: string
  updated_at: string
}

export type CatalogProduct = {
  id: number
  name: string
  description: string | null
  price: string
  unit: ProductUnit
  available: boolean
  active: boolean
  category_id: number | null
  category: { id: number; name: string; active: boolean } | null
  image?: { present: boolean; thumbnail_path: string | null }
  created_at: string
  updated_at: string
}

export type ProductChanges = {
  name: string
  description: string
  price: string
  unit: ProductUnit
  category_id: number | null
  available: boolean
  active: boolean
}

export type CategoryChanges = { name: string; position?: number; active?: boolean }
type CatalogSource = 'member' | 'platform'

const pathFor = (storeId: number, resource: 'categories' | 'products', source: CatalogSource) =>
  source === 'member'
    ? `/api/v1/stores/${storeId}/${resource}`
    : `/api/v1/admin/stores/${storeId}/${resource}`

export function fetchCategories(token: string, storeId: number, source: CatalogSource) {
  return apiRequest<{ categories: CatalogCategory[] }>(pathFor(storeId, 'categories', source), { headers: authorizationHeaders(token) })
}

export function fetchProducts(token: string, storeId: number, source: CatalogSource) {
  return apiRequest<{ products: CatalogProduct[] }>(pathFor(storeId, 'products', source), { headers: authorizationHeaders(token) })
}

export function createCategory(token: string, storeId: number, changes: CategoryChanges) {
  return apiRequest<{ category: CatalogCategory }>(pathFor(storeId, 'categories', 'member'), {
    method: 'POST', headers: authorizationHeaders(token), body: JSON.stringify({ category: changes }),
  })
}

export function updateCategory(token: string, storeId: number, categoryId: number, changes: Partial<CategoryChanges>) {
  return apiRequest<{ category: CatalogCategory }>(`${pathFor(storeId, 'categories', 'member')}/${categoryId}`, {
    method: 'PATCH', headers: authorizationHeaders(token), body: JSON.stringify({ category: changes }),
  })
}

export function archiveCategory(token: string, storeId: number, categoryId: number) {
  return apiRequest<{ category: CatalogCategory }>(`${pathFor(storeId, 'categories', 'member')}/${categoryId}`, {
    method: 'DELETE', headers: authorizationHeaders(token),
  })
}

export function createProduct(token: string, storeId: number, changes: ProductChanges) {
  return apiRequest<{ product: CatalogProduct }>(pathFor(storeId, 'products', 'member'), {
    method: 'POST', headers: authorizationHeaders(token), body: JSON.stringify({ product: changes }),
  })
}

export function updateProduct(token: string, storeId: number, productId: number, changes: Partial<ProductChanges>) {
  return apiRequest<{ product: CatalogProduct }>(`${pathFor(storeId, 'products', 'member')}/${productId}`, {
    method: 'PATCH', headers: authorizationHeaders(token), body: JSON.stringify({ product: changes }),
  })
}

export function archiveProduct(token: string, storeId: number, productId: number) {
  return apiRequest<{ product: CatalogProduct }>(`${pathFor(storeId, 'products', 'member')}/${productId}`, {
    method: 'DELETE', headers: authorizationHeaders(token),
  })
}
