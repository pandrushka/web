import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPublicCategories, fetchPublicProducts, fetchPublicStore, PublicStorefrontApiError } from '../../api/publicStorefront'
import type { PublicProductsPage } from '../../api/publicStorefront'
import type { StorefrontCategory, StorefrontProduct, StorefrontStore } from './types'
import { useAppTranslation } from '../../i18n/useAppTranslation'

const emptyPagination: PublicProductsPage['pagination'] = { page: 1, per_page: 24, total_count: 0, total_pages: 0 }
type Filters = { q?: string; categoryId?: string }

export function usePublicStorefront(slug: string, filters: Filters = {}) {
  const { t } = useAppTranslation('storefront')
  const [attempt, setAttempt] = useState(0)
  const baseKey = `${slug}:${attempt}`
  const query = filters.q?.trim() ?? ''
  const categoryId = filters.categoryId ?? ''
  const catalogKey = `${baseKey}:${query}:${categoryId}`
  const [base, setBase] = useState<{ key: string; store: StorefrontStore | null; categories: StorefrontCategory[]; error: string | null; notFound: boolean }>({ key: '', store: null, categories: [], error: null, notFound: false })
  const [catalog, setCatalog] = useState<{ key: string; products: StorefrontProduct[]; pagination: PublicProductsPage['pagination']; error: string | null; loadMoreError: string | null }>({ key: '', products: [], pagination: emptyPagination, error: null, loadMoreError: null })
  const [loadingMoreState, setLoadingMoreState] = useState<{ key: string; loading: boolean }>({ key: '', loading: false })
  const loadingMoreKey = useRef<string | null>(null)
  const currentBase = base.key === baseKey ? base : null
  const currentCatalog = catalog.key === catalogKey ? catalog : null
  const activeStore = currentBase?.store ?? null

  useEffect(() => {
    const controller = new AbortController()
    void fetchPublicStore(slug, controller.signal).then(async (response) => {
      const categoryResponse = await fetchPublicCategories(slug, controller.signal)
      if (!controller.signal.aborted) setBase({ key: baseKey, store: response.store, categories: categoryResponse.categories, error: null, notFound: false })
    }).catch((requestError: unknown) => {
      if (controller.signal.aborted) return
      const missing = requestError instanceof PublicStorefrontApiError && requestError.status === 404
      setBase({ key: baseKey, store: null, categories: [], error: requestError instanceof Error ? requestError.message : t('loadError'), notFound: missing })
    })
    return () => controller.abort()
  }, [baseKey, slug, t])

  useEffect(() => {
    if (!activeStore) return undefined
    const controller = new AbortController()
    loadingMoreKey.current = null
    void fetchPublicProducts(slug, 1, 24, { q: query, categoryId }, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setCatalog({ key: catalogKey, products: response.products, pagination: response.pagination, error: null, loadMoreError: null })
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setCatalog({ key: catalogKey, products: [], pagination: emptyPagination, error: requestError instanceof Error ? requestError.message : t('catalogLoadError'), loadMoreError: null })
      })
    return () => controller.abort()
  }, [activeStore, catalogKey, categoryId, query, slug, t])

  const loadMore = useCallback(async () => {
    const pagination = currentCatalog?.pagination
    if (!pagination || pagination.page >= pagination.total_pages || loadingMoreKey.current === catalogKey) return
    loadingMoreKey.current = catalogKey
    setLoadingMoreState({ key: catalogKey, loading: true })
    setCatalog((previous) => previous.key === catalogKey ? { ...previous, loadMoreError: null } : previous)
    try {
      const response = await fetchPublicProducts(slug, pagination.page + 1, pagination.per_page, { q: query, categoryId })
      setCatalog((previous) => {
        if (previous.key !== catalogKey) return previous
        const ids = new Set(previous.products.map((product) => product.id))
        return { ...previous, products: [...previous.products, ...response.products.filter((product) => !ids.has(product.id))], pagination: response.pagination }
      })
    } catch (requestError) {
      setCatalog((previous) => previous.key === catalogKey ? { ...previous, loadMoreError: requestError instanceof Error ? requestError.message : t('loadMoreError') } : previous)
    } finally {
      if (loadingMoreKey.current === catalogKey) loadingMoreKey.current = null
      setLoadingMoreState((previous) => previous.key === catalogKey ? { key: catalogKey, loading: false } : previous)
    }
  }, [catalogKey, categoryId, currentCatalog, query, slug, t])

  return {
    store: currentBase?.store ?? null,
    categories: currentBase?.categories ?? [],
    products: currentCatalog?.products ?? [],
    pagination: currentCatalog?.pagination ?? emptyPagination,
    loading: currentBase === null || Boolean(activeStore && currentCatalog === null),
    storeLoading: currentBase === null,
    catalogLoading: Boolean(activeStore && currentCatalog === null),
    loadingMore: loadingMoreState.key === catalogKey && loadingMoreState.loading,
    error: currentBase?.error ?? currentCatalog?.error ?? null,
    storeError: currentBase?.error ?? null,
    catalogError: currentCatalog?.error ?? null,
    notFound: currentBase?.notFound ?? false,
    loadMoreError: currentCatalog?.loadMoreError ?? null,
    retry: () => setAttempt((value) => value + 1),
    loadMore,
  }
}
