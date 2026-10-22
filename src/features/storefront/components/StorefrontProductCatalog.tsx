import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Box, Button, Card, CardActionArea, CardContent, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material'
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
  searchValue?: string
  categoryValue?: string
  onSearchChange?: (value: string) => void
  onCategoryChange?: (value: string) => void
  productLinkSlug?: string
}

function ProductPlaceholder() {
  return <Box aria-hidden="true" sx={{ display: 'grid', placeItems: 'center', width: 64, height: 64, flexShrink: 0, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark' }}><Inventory2OutlinedIcon /></Box>
}

function ProductTile({ product, category, image, language, href }: { product: StorefrontProduct; category: StorefrontCategory | null; image?: ReactNode; language?: string; href?: string }) {
  const content = (
    <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: { xs: 1.75, sm: 2 } }}>
      {image ?? <ProductPlaceholder />}
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        {category && <Typography variant="caption" color="text.secondary">{category.name}</Typography>}
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{product.name}</Typography>
        {product.description && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{product.description}</Typography>}
        <Typography variant="subtitle1" color="primary.dark" sx={{ pt: 0.5, fontWeight: 700 }}>{formatNioPrice(product.price, language)} <Typography component="span" variant="body2" color="text.secondary">/ {product.unit}</Typography></Typography>
      </Stack>
    </CardContent>
  )
  return (
    <Card variant="outlined" component="article" sx={{ height: '100%' }}>
      {href ? <CardActionArea component="a" href={href} aria-label={`${product.name} — ${formatNioPrice(product.price, language)} / ${product.unit}`}>{content}</CardActionArea> : content}
    </Card>
  )
}

export function StorefrontProductCatalog({ categories, products, loading, error, hasMore = false, loadingMore = false, loadMoreError = null, onRetry, onLoadMore, renderProductImage, searchValue, categoryValue, onSearchChange, onCategoryChange, productLinkSlug }: Props) {
  const { t, i18n } = useAppTranslation('storefront')
  const [localSearch, setLocalSearch] = useState('')
  const [localCategoryId, setLocalCategoryId] = useState('all')
  const search = searchValue ?? localSearch
  const categoryId = categoryValue ?? localCategoryId
  const hasFilters = search.trim().length > 0 || categoryId !== 'all'
  const activeCategories = useMemo(() => activeStorefrontCategories(categories), [categories])
  const visibleProducts = useMemo(() => onSearchChange || onCategoryChange ? products : filterStorefrontProducts(products, categories, search, categoryId), [categories, categoryId, onCategoryChange, onSearchChange, products, search])
  const fallbackProducts = visibleProducts.filter((product) => !storefrontProductCategory(product, categories))

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" component="h2">{t('catalogTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('catalogDescription')}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label={t('search')} value={search} onChange={(event) => onSearchChange ? onSearchChange(event.target.value) : setLocalSearch(event.target.value)} fullWidth size="small" slotProps={{ input: { startAdornment: <SearchOutlinedIcon aria-hidden="true" fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }} />
            <FormControl size="small" fullWidth>
              <InputLabel id="storefront-category-label">{t('category')}</InputLabel>
              <Select labelId="storefront-category-label" label={t('category')} value={categoryId} onChange={(event) => onCategoryChange ? onCategoryChange(event.target.value) : setLocalCategoryId(event.target.value)}>
                <MenuItem value="all">{t('allCategories')}</MenuItem>
                {activeCategories.map((category) => <MenuItem key={category.id} value={category.id.toString()}>{category.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          {loading ? <Stack spacing={1.5} aria-label={t('loadingProducts')}>{[0, 1, 2].map((item) => <Skeleton key={item} variant="rounded" height={100} />)}</Stack> : error ? (
            <Alert severity="error" action={onRetry && <Button color="inherit" startIcon={<ReplayOutlinedIcon />} onClick={onRetry}>{t('retry')}</Button>}>{error}</Alert>
          ) : products.filter((product) => product.active !== false && product.available !== false).length === 0 && !hasMore ? (
            <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">{t('empty')}</Typography></Box>
          ) : (
            <>
              {visibleProducts.length === 0 ? <Typography color="text.secondary" sx={{ py: 2 }}>{onSearchChange || onCategoryChange ? t('noResults') : hasMore && hasFilters ? t('noMatchesLoaded') : hasMore ? t('moreProducts') : t('noResults')}</Typography> : (
                <Stack spacing={2}>
                  {activeCategories.filter((category) => categoryId === 'all' || category.id.toString() === categoryId).map((category) => {
                    const categoryProducts = visibleProducts.filter((product) => storefrontProductCategory(product, categories)?.id === category.id)
                    if (!categoryProducts.length) return null
                    return <section key={category.id} aria-label={category.name}><Typography variant="subtitle1" component="h3" sx={{ mb: 1, fontWeight: 600 }}>{category.name}</Typography><Box data-testid="storefront-product-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>{categoryProducts.map((product) => <ProductTile key={product.id} product={product} category={category} image={renderProductImage?.(product)} language={i18n.resolvedLanguage} href={productLinkSlug ? `/${encodeURIComponent(productLinkSlug)}/products/${product.id}` : undefined} />)}</Box></section>
                  })}
                  {fallbackProducts.length > 0 && <section aria-label={t('otherProducts')}><Typography variant="subtitle1" component="h3" sx={{ mb: 1, fontWeight: 600 }}>{t('otherProducts')}</Typography><Box data-testid="storefront-product-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>{fallbackProducts.map((product) => <ProductTile key={product.id} product={product} category={null} image={renderProductImage?.(product)} language={i18n.resolvedLanguage} href={productLinkSlug ? `/${encodeURIComponent(productLinkSlug)}/products/${product.id}` : undefined} />)}</Box></section>}
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
