import type { StorefrontCategory, StorefrontProduct } from './types'

export function activeStorefrontCategories(categories: StorefrontCategory[]) {
  return categories.filter((category) => category.active !== false).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

export function storefrontProductCategory(product: StorefrontProduct, categories: StorefrontCategory[]) {
  const categoryId = product.category?.id ?? product.category_id
  if (!categoryId) return null
  const category = categories.find((item) => item.id === categoryId)
  return category && category.active !== false && product.category?.active !== false ? category : null
}

export function filterStorefrontProducts(products: StorefrontProduct[], categories: StorefrontCategory[], search: string, categoryId: string) {
  return products.filter((product) => product.active !== false && product.available !== false)
    .filter((product) => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .filter((product) => categoryId === 'all' || storefrontProductCategory(product, categories)?.id.toString() === categoryId)
}
