import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import type { StorefrontStore } from '../types'
import { useAppTranslation } from '../../../i18n/useAppTranslation'

function ProfileItem({ icon, label, value }: { icon: ReactNode; label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null
  return <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
    <Box sx={{ color: 'primary.main', display: 'flex', mt: 0.25 }} aria-hidden="true">{icon}</Box>
    <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography><Typography sx={{ overflowWrap: 'anywhere' }}>{value}</Typography></Box>
  </Stack>
}

export function StorefrontProfile({ store }: { store: StorefrontStore }) {
  const { t } = useAppTranslation('storefront')
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack spacing={2.5}>
          {store.description?.trim() && <Box><Typography variant="h6" component="h2" sx={{ mb: 0.75 }}>{t('about')}</Typography><Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{store.description}</Typography></Box>}
          <Grid container spacing={2.5}>
            {store.phone_number && <Grid size={{ xs: 12, sm: 6 }}><ProfileItem icon={<PhoneOutlinedIcon />} label={t('phone')} value={store.phone_number} /></Grid>}
            {(store.address || store.directions) && <Grid size={{ xs: 12, sm: 6 }}><ProfileItem icon={<LocationOnOutlinedIcon />} label={t('location')} value={[store.address, store.directions].filter(Boolean).join(' · ')} /></Grid>}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  )
}
