import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import { PublicProductImage } from './PublicProductImage'
import { StorefrontPage } from './components/StorefrontPage'
import { usePublicStorefront } from './usePublicStorefront'
import { useAppTranslation } from '../../i18n/useAppTranslation'

export function PublicStorefrontRoute({ slug }: { slug: string }) {
  const { t } = useAppTranslation('storefront')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const storefront = usePublicStorefront(slug, { q: search, categoryId })

  if (storefront.storeLoading) {
    return <Box sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}><Stack spacing={1.5} sx={{ alignItems: 'center' }}><CircularProgress aria-label={t('loading')} /><Typography color="text.secondary">{t('loading')}</Typography></Stack></Box>
  }

  if (storefront.notFound) {
    return <Container component="main" maxWidth="sm" sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', py: 4 }}><Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}><Typography variant="h4" component="h1">{t('notFoundTitle')}</Typography><Typography color="text.secondary">{t('notFound')}</Typography></Stack></Container>
  }

  if (storefront.storeError || !storefront.store) {
    const retryMessage = storefront.storeError ?? t('loadError')
    return <Container component="main" maxWidth="sm" sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', py: 4 }}><Alert severity="error" action={<Button color="inherit" startIcon={<ReplayOutlinedIcon />} onClick={storefront.retry}>{t('retry')}</Button>}>{retryMessage}</Alert></Container>
  }

  return (
    <StorefrontPage
      store={storefront.store}
      catalog={{ categories: storefront.categories, products: storefront.products, loading: storefront.catalogLoading, error: storefront.catalogError }}
      onRetry={storefront.retry}
      hasMore={storefront.pagination.page < storefront.pagination.total_pages}
      loadingMore={storefront.loadingMore}
      loadMoreError={storefront.loadMoreError}
      onLoadMore={storefront.loadMore}
      renderProductImage={(product) => <PublicProductImage path={product.image?.present ? product.image.thumbnail_path : null} alt={`${product.name} image`} />}
      productLinkSlug={storefront.store.slug}
      searchValue={searchInput}
      categoryValue={categoryId || 'all'}
      onSearchChange={setSearchInput}
      onCategoryChange={(value) => setCategoryId(value === 'all' ? '' : value)}
    />
  )
}
