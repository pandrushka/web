import { useEffect, useState } from 'react'
import { fetchCategories, fetchProducts } from '../../api/catalog'
import type { CatalogCategory, CatalogProduct } from '../../api/catalog'

export type StorefrontCatalogState = {
  categories: CatalogCategory[]
  products: CatalogProduct[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function useStorefrontCatalog(accessToken: string, storeId: number, source: 'member' | 'platform'): StorefrontCatalogState {
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCategories([])
    setProducts([])
    Promise.all([
      fetchCategories(accessToken, storeId, source),
      fetchProducts(accessToken, storeId, source),
    ]).then(([categoryResponse, productResponse]) => {
      if (cancelled) return
      setCategories(categoryResponse.categories)
      setProducts(productResponse.products)
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not load this store’s catalog.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [accessToken, attempt, source, storeId])

  return { categories, products, loading, error, retry: () => setAttempt((value) => value + 1) }
}
