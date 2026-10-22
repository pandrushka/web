import { Alert, Box, Button, Stack } from '@mui/material'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import type { StoreProfile } from '../../../api/stores'
import { StorefrontPage } from './StorefrontPage'
import { useStorefrontCatalog } from '../useStorefrontCatalog'
import { ProductImage } from '../../catalog/ProductImage'
import type { ImageTokenRefresh } from '../../../api/productImages'
import { useAppTranslation } from '../../../i18n/useAppTranslation'

type Props = { store: StoreProfile; accessToken: string; catalogSource: 'member' | 'platform'; cacheScope?: string; refreshAccessToken?: ImageTokenRefresh; onReturn: () => void }

export function StorefrontPreview({ store, accessToken, catalogSource, cacheScope = `store-${store.id}`, refreshAccessToken, onReturn }: Props) {
  const { t } = useAppTranslation('storefront')
  const catalog = useStorefrontCatalog(accessToken, store.id, catalogSource)
  return (
    <Stack spacing={2}>
      <Alert severity={store.status === 'suspended' ? 'warning' : 'info'} role="status">
        {store.status === 'active' ? t('published') : store.status === 'suspended' ? t('suspended') : t('notPublished')}
      </Alert>
      <Button startIcon={<ArrowBackOutlinedIcon />} onClick={onReturn} sx={{ alignSelf: 'flex-start', minHeight: 48 }}>{t('returnDashboard')}</Button>
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: { xs: 0, sm: 3 }, overflow: 'hidden', bgcolor: 'background.default' }}>
        <StorefrontPage
          store={store}
          catalog={catalog}
          onRetry={catalog.retry}
          renderProductImage={(product) => <ProductImage path={product.image?.present ? product.image.thumbnail_path : null} accessToken={accessToken} cacheScope={cacheScope} alt={`${product.name} image`} refreshAccessToken={refreshAccessToken} size={64} />}
        />
      </Box>
    </Stack>
  )
}
