import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import { PublicProductImage } from './PublicProductImage'
import { StorefrontPage } from './components/StorefrontPage'
import { usePublicStorefront } from './usePublicStorefront'

export function PublicStorefrontRoute({ slug }: { slug: string }) {
  const storefront = usePublicStorefront(slug)

  if (storefront.loading) {
    return <Box sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}><Stack spacing={1.5} sx={{ alignItems: 'center' }}><CircularProgress aria-label="Loading store" /><Typography color="text.secondary">Loading store…</Typography></Stack></Box>
  }

  if (storefront.notFound) {
    return <Container component="main" maxWidth="sm" sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', py: 4 }}><Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}><Typography variant="h4" component="h1">Store not found</Typography><Typography color="text.secondary">This store isn’t available. Check the link or try again later.</Typography></Stack></Container>
  }

  if (storefront.error || !storefront.store) {
    const retryMessage = storefront.error ?? 'Could not load this store.'
    return <Container component="main" maxWidth="sm" sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', py: 4 }}><Alert severity="error" action={<Button color="inherit" startIcon={<ReplayOutlinedIcon />} onClick={storefront.retry}>Retry</Button>}>{retryMessage}</Alert></Container>
  }

  return (
    <StorefrontPage
      store={storefront.store}
      catalog={{ categories: storefront.categories, products: storefront.products, loading: false, error: null }}
      hasMore={storefront.pagination.page < storefront.pagination.total_pages}
      loadingMore={storefront.loadingMore}
      loadMoreError={storefront.loadMoreError}
      onLoadMore={storefront.loadMore}
      renderProductImage={(product) => <PublicProductImage path={product.image?.present ? product.image.thumbnail_path : null} alt={`${product.name} image`} />}
    />
  )
}
