import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Box, Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import type { StorefrontCategory, StorefrontProduct } from '../types'
import { activeStorefrontCategories, filterStorefrontProducts, storefrontProductCategory } from '../filterStorefrontProducts'
import { useAppTranslation } from '../../../i18n/useAppTranslation'
import { formatNioPrice } from '../../../utils/formatNioPrice'

type Props = {
  categories: StorefrontCategory[]
  products: StorefrontProduct[]
  loading: boolean
  error: string | null
  hasMore?: boolean
  loadingMore?: boolean
  loadMoreError?: string | null
  onRetry?: () => void
  onLoadMore?: () => void
  renderProductImage?: (product: StorefrontProduct) => ReactNode
}

function ProductPlaceholder() {
  return <Box aria-hidden="true" sx={{ display: 'grid', placeItems: 'center', width: 64, height: 64, flexShrink: 0, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark' }}><Inventory2OutlinedIcon /></Box>
}

function ProductTile({ product, category, image, language }: { product: StorefrontProduct; category: StorefrontCategory | null; image?: ReactNode; language?: string }) {
  return (
    <Card variant="outlined" component="article" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: { xs: 1.75, sm: 2 } }}>
        {image ?? <ProductPlaceholder />}
        <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
          {category && <Typography variant="caption" color="text.secondary">{category.name}</Typography>}
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{product.name}</Typography>
          {product.description && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{product.description}</Typography>}
          <Typography variant="subtitle1" color="primary.dark" sx={{ pt: 0.5, fontWeight: 700 }}>{formatNioPrice(product.price, language)} <Typography component="span" variant="body2" color="text.secondary">/ {product.unit}</Typography></Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

export function StorefrontProductCatalog({ categories, products, loading, error, hasMore = false, loadingMore = false, loadMoreError = null, onRetry, onLoadMore, renderProductImage }: Props) {
  const { t, i18n } = useAppTranslation('storefront')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const hasFilters = search.trim().length > 0 || categoryId !== 'all'
  const activeCategories = useMemo(() => activeStorefrontCategories(categories), [categories])
  const visibleProducts = useMemo(() => filterStorefrontProducts(products, categories, search, categoryId), [categories, categoryId, products, search])
  const fallbackProducts = visibleProducts.filter((product) => !storefrontProductCategory(product, categories))

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" component="h2">{t('catalogTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('catalogDescription')}</Typography>
          </Box>
          {loading ? <Stack spacing={1.5} aria-label={t('loadingProducts')}>{[0, 1, 2].map((item) => <Skeleton key={item} variant="rounded" height={100} />)}</Stack> : error ? (
            <Alert severity="error" action={onRetry && <Button color="inherit" startIcon={<ReplayOutlinedIcon />} onClick={onRetry}>{t('retry')}</Button>}>{error}</Alert>
          ) : products.filter((product) => product.active !== false && product.available !== false).length === 0 && !hasMore ? (
            <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">{t('empty')}</Typography></Box>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label={t('search')} value={search} onChange={(event) => setSearch(event.target.value)} fullWidth size="small" slotProps={{ input: { startAdornment: <SearchOutlinedIcon aria-hidden="true" fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }} />
                <FormControl size="small" fullWidth>
                  <InputLabel id="storefront-category-label">{t('category')}</InputLabel>
                  <Select labelId="storefront-category-label" label={t('category')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                    <MenuItem value="all">{t('allCategories')}</MenuItem>
                    {activeCategories.map((category) => <MenuItem key={category.id} value={category.id.toString()}>{category.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              {visibleProducts.length === 0 ? <Typography color="text.secondary" sx={{ py: 2 }}>{hasMore && hasFilters ? t('noMatchesLoaded') : hasMore ? t('moreProducts') : t('noResults')}</Typography> : (
                <Stack spacing={2}>
                  {activeCategories.filter((category) => categoryId === 'all' || category.id.toString() === categoryId).map((category) => {
                    const categoryProducts = visibleProducts.filter((product) => storefrontProductCategory(product, categories)?.id === category.id)
                    if (!categoryProducts.length) return null
                    return <section key={category.id} aria-label={category.name}><Typography variant="subtitle1" component="h3" sx={{ mb: 1, fontWeight: 600 }}>{category.name}</Typography><Box data-testid="storefront-product-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>{categoryProducts.map((product) => <ProductTile key={product.id} product={product} category={category} image={renderProductImage?.(product)} language={i18n.resolvedLanguage} />)}</Box></section>
                  })}
                  {fallbackProducts.length > 0 && <section aria-label={t('otherProducts')}><Typography variant="subtitle1" component="h3" sx={{ mb: 1, fontWeight: 600 }}>{t('otherProducts')}</Typography><Box data-testid="storefront-product-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>{fallbackProducts.map((product) => <ProductTile key={product.id} product={product} category={null} image={renderProductImage?.(product)} language={i18n.resolvedLanguage} />)}</Box></section>}
                </Stack>
              )}
              {loadMoreError && <Alert severity="error" action={onLoadMore && <Button color="inherit" onClick={onLoadMore}>{t('retry')}</Button>}>{loadMoreError}</Alert>}
              {hasMore && <Button variant="outlined" onClick={onLoadMore} disabled={loadingMore} sx={{ alignSelf: 'center', minHeight: 48, minWidth: 160 }}>{loadingMore ? t('loading') : t('loadMore')}</Button>}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
