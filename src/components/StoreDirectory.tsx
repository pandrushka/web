import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material'
import { fetchAllStores, fetchMyStores } from '../api/stores'
import type { PlatformStoresResponse, StoreProfile } from '../api/stores'
import { storeMembershipRoleLabel } from '../utils/roleLabels'

type StoreDirectoryProps = {
  kind: 'member' | 'platform'
  accessToken: string
  onMemberStoresLoaded?: (stores: StoreProfile[]) => void
  onSelectStore?: (store: StoreProfile) => void
}

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'error'
  if (status === 'draft') return 'warning'
  return 'default'
}

export function StoreDirectory({ kind, accessToken, onMemberStoresLoaded, onSelectStore }: StoreDirectoryProps) {
  const [stores, setStores] = useState<StoreProfile[]>([])
  const [pagination, setPagination] = useState<PlatformStoresResponse['pagination'] | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const request = kind === 'member'
      ? fetchMyStores(accessToken)
      : fetchAllStores(accessToken, page)

    void request.then((response) => {
      if (cancelled) return
      setStores(response.stores)
      if (kind === 'platform') setPagination((response as PlatformStoresResponse).pagination)
      else onMemberStoresLoaded?.(response.stores)
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not load stores.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [accessToken, kind, onMemberStoresLoaded, page])

  if (loading) return <Stack sx={{ py: 8, alignItems: 'center' }}><CircularProgress aria-label="Loading stores" /></Stack>
  if (error) return <Alert severity="error">{error}</Alert>
  if (stores.length === 0) {
    return (
      <Card><CardContent sx={{ py: { xs: 4, sm: 6 }, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>{kind === 'member' ? 'No store access yet' : 'No stores found'}</Typography>
        <Typography color="text.secondary">{kind === 'member' ? 'Stores available to your account will appear here.' : 'There are no stores to display.'}</Typography>
      </CardContent></Card>
    )
  }

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        {stores.map((store) => {
          const membershipRoleLabel = storeMembershipRoleLabel(store.membership?.role)
          const content = (
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700 }}>
                  {store.logo_initial || store.name.slice(0, 1).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" component="h2" sx={{ overflowWrap: 'anywhere' }}>{store.name}</Typography>
                  <Typography color="text.secondary" variant="body2">{store.city}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Chip size="small" label={store.status} color={statusColor(store.status)} sx={{ textTransform: 'capitalize' }} />
                {membershipRoleLabel && <Chip size="small" label={membershipRoleLabel} variant="outlined" />}
              </Stack>
            </CardContent>
          )

          return (
            <Grid key={store.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: '100%' }}>
                {onSelectStore ? <CardActionArea onClick={() => onSelectStore(store)} aria-label={`View ${store.name} details`} sx={{ height: '100%' }}>{content}</CardActionArea> : content}
              </Card>
            </Grid>
          )
        })}
      </Grid>
      {kind === 'platform' && pagination && pagination.total_pages > 1 && (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Page {pagination.page} of {pagination.total_pages} · {pagination.total_count} stores</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <Button variant="outlined" disabled={page >= pagination.total_pages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
