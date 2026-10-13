import { Avatar, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import type { StoreProfile } from '../api/stores'
import { storeMembershipRoleLabel } from '../utils/roleLabels'

type StoreOverviewProps = { store: StoreProfile }

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'error'
  if (status === 'draft') return 'warning'
  return 'default'
}

export function StoreOverview({ store }: StoreOverviewProps) {
  const membershipRoleLabel = storeMembershipRoleLabel(store.membership?.role)
  return (
    <Stack spacing={2.5}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 650 }}>Store dashboard</Typography>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
            <Avatar variant="rounded" sx={{ width: 72, height: 72, bgcolor: 'primary.light', color: 'primary.dark', fontSize: '1.75rem', fontWeight: 700 }}>
              {store.logo_initial || store.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" component="h2" sx={{ overflowWrap: 'anywhere' }}>{store.name}</Typography>
              <Typography color="text.secondary">{store.city}</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={store.status} color={statusColor(store.status)} sx={{ textTransform: 'capitalize' }} />
                {membershipRoleLabel && <Chip label={membershipRoleLabel} variant="outlined" />}
              </Stack>
            </Stack>
          </Stack>
          {store.description && <Typography sx={{ mt: 3 }} color="text.secondary">{store.description}</Typography>}
        </CardContent>
      </Card>
    </Stack>
  )
}
