import { useEffect, useState } from 'react'
import { fetchCategories, fetchProducts } from '../../api/catalog'
import type { CatalogCategory, CatalogProduct } from '../../api/catalog'
import { useAppTranslation } from '../../i18n/useAppTranslation'

export type StorefrontCatalogState = {
  categories: CatalogCategory[]
  products: CatalogProduct[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function useStorefrontCatalog(accessToken: string, storeId: number, source: 'member' | 'platform'): StorefrontCatalogState {
  const { t } = useAppTranslation('storefront')
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${source}:${storeId}:${accessToken}:${attempt}`
  const [result, setResult] = useState<{ key: string; categories: CatalogCategory[]; products: CatalogProduct[]; error: string | null }>({ key: '', categories: [], products: [], error: null })
  const isCurrent = result.key === requestKey
  const categories = isCurrent ? result.categories : []
  const products = isCurrent ? result.products : []
  const loading = !isCurrent
  const error = isCurrent ? result.error : null

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchCategories(accessToken, storeId, source),
      fetchProducts(accessToken, storeId, source),
    ]).then(([categoryResponse, productResponse]) => {
      if (cancelled) return
      setResult({ key: requestKey, categories: categoryResponse.categories, products: productResponse.products, error: null })
    }).catch((requestError: unknown) => {
      if (!cancelled) setResult({ key: requestKey, categories: [], products: [], error: requestError instanceof Error ? requestError.message : t('catalogLoadError') })
    })
    return () => { cancelled = true }
  }, [accessToken, requestKey, source, storeId, t])

  return { categories, products, loading, error, retry: () => setAttempt((value) => value + 1) }
}
