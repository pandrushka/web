import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from '@mui/material'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import { fetchPublicProduct, fetchPublicStore, PublicStorefrontApiError } from '../../api/publicStorefront'
import type { StorefrontProduct, StorefrontStore } from './types'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { PublicProductImage } from './PublicProductImage'
import { StorefrontHeader } from './components/StorefrontHeader'
import { formatNioPrice } from '../../utils/formatNioPrice'

type Snapshot = { key: string; store: StorefrontStore | null; product: StorefrontProduct | null; error: string | null; notFound: boolean }

export function PublicProductDetailRoute({ slug, productId }: { slug: string; productId: string }) {
  const { t, i18n } = useAppTranslation('storefront')
  const [attempt, setAttempt] = useState(0)
  const key = `${slug}:${productId}:${attempt}`
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: '', store: null, product: null, error: null, notFound: false })
  const current = snapshot.key === key ? snapshot : null

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([fetchPublicStore(slug, controller.signal), fetchPublicProduct(slug, productId, controller.signal)])
      .then(([storeResponse, productResponse]) => {
        if (!controller.signal.aborted) setSnapshot({ key, store: storeResponse.store, product: productResponse.product, error: null, notFound: false })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const notFound = error instanceof PublicStorefrontApiError && error.status === 404
        setSnapshot({ key, store: null, product: null, error: error instanceof Error ? error.message : t('loadError'), notFound })
      })
    return () => controller.abort()
  }, [key, productId, slug, t])

  if (!current) return <Box role="status" sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}><CircularProgress aria-label={t('loading')} /></Box>
  if (current.notFound) return <Container component="main" maxWidth="sm" sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', py: 4 }}><Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}><Typography variant="h4" component="h1">{t('productNotFoundTitle')}</Typography><Typography color="text.secondary">{t('notFound')}</Typography><Button component="a" href={`/${encodeURIComponent(slug)}`} startIcon={<ArrowBackOutlinedIcon />}>{t('backToStore')}</Button></Stack></Container>
  if (current.error || !current.product || !current.store) return <Container component="main" maxWidth="sm" sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', py: 4 }}><Alert severity="error" action={<Button color="inherit" startIcon={<ReplayOutlinedIcon />} onClick={() => setAttempt((value) => value + 1)}>{t('retry')}</Button>}>{current.error ?? t('loadError')}</Alert></Container>

  const { product, store } = current
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <StorefrontHeader store={store} />
      <Container component="main" maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
        <Button component="a" href={`/${encodeURIComponent(slug)}`} startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 2 }}>{t('backToStore')}</Button>
        <Card variant="outlined">
          <CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(220px, 0.8fr) 1.2fr' }, gap: { xs: 2, sm: 3 }, p: { xs: 2, sm: 3 } }}>
            <PublicProductImage path={product.image?.present ? product.image.thumbnail_path : null} alt={`${product.name} image`} size="100%" />
            <Stack spacing={1.25}>
              {product.category && <Typography variant="overline" color="text.secondary">{product.category.name}</Typography>}
              <Typography component="h1" variant="h4" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{product.name}</Typography>
              {product.description && <Typography color="text.secondary">{product.description}</Typography>}
              <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 700 }}>{formatNioPrice(product.price, i18n.resolvedLanguage)} <Typography component="span" variant="body1" color="text.secondary">/ {product.unit}</Typography></Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
