import { Box, Stack } from '@mui/material'
import type { StorefrontCatalog, StorefrontStore, StorefrontProduct } from '../types'
import { StorefrontProductCatalog } from './StorefrontProductCatalog'
import { StorefrontHeader } from './StorefrontHeader'
import { StorefrontProfile } from './StorefrontProfile'
import type { ReactNode } from 'react'

type Props = {
  store: StorefrontStore
  catalog: StorefrontCatalog
  onRetry?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  loadMoreError?: string | null
  onLoadMore?: () => void
  renderProductImage?: (product: StorefrontProduct) => ReactNode
}

export function StorefrontPage({ store, catalog, onRetry, hasMore, loadingMore, loadMoreError, onLoadMore, renderProductImage }: Props) {
  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <StorefrontHeader store={store} />
      <Stack spacing={2} sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
        <StorefrontProfile store={store} />
        <StorefrontProductCatalog {...catalog} hasMore={hasMore} loadingMore={loadingMore} loadMoreError={loadMoreError} onRetry={onRetry} onLoadMore={onLoadMore} renderProductImage={renderProductImage} />
      </Stack>
    </Box>
  )
}
