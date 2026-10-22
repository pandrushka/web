import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPublicCategories, fetchPublicProducts, fetchPublicStore, PublicStorefrontApiError } from '../../api/publicStorefront'
import type { PublicProductsPage } from '../../api/publicStorefront'
import type { StorefrontCategory, StorefrontProduct, StorefrontStore } from './types'
import { useAppTranslation } from '../../i18n/useAppTranslation'

const emptyPagination: PublicProductsPage['pagination'] = { page: 1, per_page: 24, total_count: 0, total_pages: 0 }

export function usePublicStorefront(slug: string) {
  const { t } = useAppTranslation('storefront')
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${slug}:${attempt}`
  const [snapshot, setSnapshot] = useState<{
    key: string
    store: StorefrontStore | null
    categories: StorefrontCategory[]
    products: StorefrontProduct[]
    pagination: PublicProductsPage['pagination']
    loading: boolean
    error: string | null
    notFound: boolean
    loadMoreError: string | null
  }>({ key: '', store: null, categories: [], products: [], pagination: emptyPagination, loading: true, error: null, notFound: false, loadMoreError: null })
  const current = snapshot.key === requestKey ? snapshot : null
  const store = current?.store ?? null
  const categories = current?.categories ?? []
  const products = current?.products ?? []
  const pagination = current?.pagination ?? emptyPagination
  const loading = current === null || current.loading
  const error = current?.error ?? null
  const notFound = current?.notFound ?? false
  const loadMoreError = current?.loadMoreError ?? null
  const [loadingMoreState, setLoadingMoreState] = useState<{ key: string; loading: boolean }>({ key: '', loading: false })
  const loadingMore = loadingMoreState.key === requestKey && loadingMoreState.loading
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadingMoreRef.current = false

    void fetchPublicStore(slug).then(async (response) => {
      if (cancelled) return
      setSnapshot({ key: requestKey, store: response.store, categories: [], products: [], pagination: emptyPagination, loading: true, error: null, notFound: false, loadMoreError: null })
      const [categoryResponse, productResponse] = await Promise.all([
        fetchPublicCategories(slug),
        fetchPublicProducts(slug),
      ])
      if (cancelled) return
      setSnapshot({ key: requestKey, store: response.store, categories: categoryResponse.categories, products: productResponse.products, pagination: productResponse.pagination, loading: false, error: null, notFound: false, loadMoreError: null })
    }).catch((requestError: unknown) => {
      if (cancelled) return
      const missing = requestError instanceof PublicStorefrontApiError && requestError.status === 404
      setSnapshot({ key: requestKey, store: null, categories: [], products: [], pagination: emptyPagination, loading: false, notFound: missing, error: requestError instanceof Error ? requestError.message : t('loadError'), loadMoreError: null })
    })

    return () => { cancelled = true }
  }, [requestKey, slug, t])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || pagination.page >= pagination.total_pages) return
    loadingMoreRef.current = true
    setLoadingMoreState({ key: requestKey, loading: true })
    setSnapshot((currentSnapshot) => currentSnapshot.key === requestKey ? { ...currentSnapshot, loadMoreError: null } : currentSnapshot)
    try {
      const response = await fetchPublicProducts(slug, pagination.page + 1, pagination.per_page)
      setSnapshot((currentSnapshot) => {
        if (currentSnapshot.key !== requestKey) return currentSnapshot
        const ids = new Set(currentSnapshot.products.map((product) => product.id))
        return { ...currentSnapshot, products: [...currentSnapshot.products, ...response.products.filter((product) => !ids.has(product.id))], pagination: response.pagination }
      })
    } catch (requestError) {
      setSnapshot((currentSnapshot) => currentSnapshot.key === requestKey ? { ...currentSnapshot, loadMoreError: requestError instanceof Error ? requestError.message : t('loadMoreError') } : currentSnapshot)
    } finally {
      loadingMoreRef.current = false
      setLoadingMoreState({ key: requestKey, loading: false })
    }
  }, [pagination.page, pagination.per_page, pagination.total_pages, requestKey, slug, t])

  return {
    store,
    categories,
    products,
    pagination,
    loading,
    loadingMore,
    error,
    notFound,
    loadMoreError,
    retry: () => setAttempt((current) => current + 1),
    loadMore,
  }
}
