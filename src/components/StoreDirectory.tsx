import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material'
import { fetchAllStores, fetchMyStores } from '../api/stores'
import type { PlatformStoresResponse, StoreProfile } from '../api/stores'
import { storeMembershipRoleLabel } from '../utils/roleLabels'
import { useAppTranslation } from '../i18n/useAppTranslation'

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
  const { t, i18n } = useAppTranslation(['stores', 'common'])
  const formatNumber = new Intl.NumberFormat(i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-NI').format
  const [result, setResult] = useState<{ key: string; stores: StoreProfile[]; pagination: PlatformStoresResponse['pagination'] | null; error: string | null }>({ key: '', stores: [], pagination: null, error: null })
  const [page, setPage] = useState(1)
  const requestKey = `${kind}:${accessToken}:${page}`
  const currentResult = result.key === requestKey ? result : null
  const stores = currentResult?.stores ?? []
  const pagination = currentResult?.pagination ?? null
  const loading = currentResult === null
  const error = currentResult?.error ?? null

  useEffect(() => {
    let cancelled = false

    const request = kind === 'member'
      ? fetchMyStores(accessToken)
      : fetchAllStores(accessToken, page)

    void request.then((response) => {
      if (cancelled) return
      setResult({
        key: requestKey,
        stores: response.stores,
        pagination: kind === 'platform' ? (response as PlatformStoresResponse).pagination : null,
        error: null,
      })
      if (kind === 'member') onMemberStoresLoaded?.(response.stores)
    }).catch((requestError: unknown) => {
      if (!cancelled) setResult({ key: requestKey, stores: [], pagination: null, error: requestError instanceof Error ? requestError.message : t('list.error', { ns: 'stores' }) })
    })

    return () => { cancelled = true }
  }, [accessToken, kind, onMemberStoresLoaded, page, requestKey, t])

  if (loading) return <Stack sx={{ py: 8, alignItems: 'center' }}><CircularProgress aria-label={t('list.loading', { ns: 'stores' })} /></Stack>
  if (error) return <Alert severity="error">{error}</Alert>
  if (stores.length === 0) {
    return (
      <Card><CardContent sx={{ py: { xs: 4, sm: 6 }, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>{kind === 'member' ? t('list.noAccess', { ns: 'stores' }) : t('list.noStores', { ns: 'stores' })}</Typography>
        <Typography color="text.secondary">{kind === 'member' ? t('list.memberEmpty', { ns: 'stores' }) : t('list.empty', { ns: 'stores' })}</Typography>
      </CardContent></Card>
    )
  }

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        {stores.map((store) => {
          const rawRole = store.membership?.role
          const membershipRoleLabel = rawRole === 'owner' ? t('roles.owner', { ns: 'dashboard' }) : rawRole === 'admin' ? t('roles.admin', { ns: 'dashboard' }) : rawRole === 'employee' ? t('roles.employee', { ns: 'dashboard' }) : storeMembershipRoleLabel(rawRole, (key) => t(key, { ns: 'dashboard' }))
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
                <Chip size="small" label={t(`common:states.${store.status}`)} color={statusColor(store.status)} sx={{ textTransform: 'capitalize' }} />
                {membershipRoleLabel && <Chip size="small" label={membershipRoleLabel} variant="outlined" />}
              </Stack>
            </CardContent>
          )

          return (
            <Grid key={store.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: '100%' }}>
                {onSelectStore ? <CardActionArea onClick={() => onSelectStore(store)} aria-label={t('list.viewDetails', { name: store.name })} sx={{ height: '100%' }}>{content}</CardActionArea> : content}
              </Card>
            </Grid>
          )
        })}
      </Grid>
      {kind === 'platform' && pagination && pagination.total_pages > 1 && (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">{t('list.pagination', { page: formatNumber(pagination.page), pages: formatNumber(pagination.total_pages), count: formatNumber(pagination.total_count) })}</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>{t('list.previous', { ns: 'stores' })}</Button>
            <Button variant="outlined" disabled={page >= pagination.total_pages} onClick={() => setPage((current) => current + 1)}>{t('list.next', { ns: 'stores' })}</Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
