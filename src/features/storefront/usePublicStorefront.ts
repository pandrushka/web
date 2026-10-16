import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPublicCategories, fetchPublicProducts, fetchPublicStore, PublicStorefrontApiError } from '../../api/publicStorefront'
import type { PublicProductsPage } from '../../api/publicStorefront'
import type { StorefrontCategory, StorefrontProduct, StorefrontStore } from './types'

export function usePublicStorefront(slug: string) {
  const [store, setStore] = useState<StorefrontStore | null>(null)
  const [categories, setCategories] = useState<StorefrontCategory[]>([])
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [pagination, setPagination] = useState<PublicProductsPage['pagination']>({ page: 1, per_page: 24, total_count: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setStore(null)
    setCategories([])
    setProducts([])
    setPagination({ page: 1, per_page: 24, total_count: 0, total_pages: 0 })
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    setNotFound(false)
    setLoadMoreError(null)
    loadingMoreRef.current = false

    void fetchPublicStore(slug).then(async (response) => {
      if (cancelled) return
      setStore(response.store)
      const [categoryResponse, productResponse] = await Promise.all([
        fetchPublicCategories(slug),
        fetchPublicProducts(slug),
      ])
      if (cancelled) return
      setCategories(categoryResponse.categories)
      setProducts(productResponse.products)
      setPagination(productResponse.pagination)
    }).catch((requestError: unknown) => {
      if (cancelled) return
      setNotFound(requestError instanceof PublicStorefrontApiError && requestError.status === 404)
      setError(requestError instanceof Error ? requestError.message : 'Could not load this store.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [attempt, slug])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || pagination.page >= pagination.total_pages) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const response = await fetchPublicProducts(slug, pagination.page + 1, pagination.per_page)
      setProducts((loaded) => {
        const ids = new Set(loaded.map((product) => product.id))
        return [...loaded, ...response.products.filter((product) => !ids.has(product.id))]
      })
      setPagination(response.pagination)
    } catch (requestError) {
      setLoadMoreError(requestError instanceof Error ? requestError.message : 'Could not load more products.')
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [pagination.page, pagination.per_page, pagination.total_pages, slug])

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
