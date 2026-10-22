import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Card, CardActionArea, CardContent, CircularProgress, Container, Grid, Stack, TextField, Typography } from '@mui/material'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { fetchPublicStores } from '../../api/publicStorefront'
import type { PublicStoreDirectoryPage, PublicStoreSummary } from '../../api/publicStorefront'
import { useAppTranslation } from '../../i18n/useAppTranslation'

const PAGE_SIZE = 24
type Result = { key: string; stores: PublicStoreSummary[]; pagination: PublicStoreDirectoryPage['pagination']; error: string | null }

export function PublicStoreDirectoryRoute() {
  const { t } = useAppTranslation(['stores', 'common'])
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [page, setPage] = useState(1)
  const [debouncedFilters, setDebouncedFilters] = useState({ q: '', city: '' })
  const requestKey = `${debouncedFilters.q}:${debouncedFilters.city}:${page}`
  const [result, setResult] = useState<Result>({ key: '', stores: [], pagination: { page: 1, per_page: PAGE_SIZE, total_count: 0, total_pages: 0 }, error: null })
  const [attempt, setAttempt] = useState(0)
  const current = result.key === `${requestKey}:${attempt}` ? result : null

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      const nextFilters = { q: query.trim(), city: city.trim() }
      setDebouncedFilters((current) => current.q === nextFilters.q && current.city === nextFilters.city ? current : nextFilters)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [city, query])

  useEffect(() => {
    const controller = new AbortController()
    const key = `${requestKey}:${attempt}`
    void fetchPublicStores({ ...debouncedFilters, page, perPage: PAGE_SIZE }, controller.signal)
      .then((response) => setResult({ key, stores: response.stores, pagination: response.pagination, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, stores: [], pagination: { page, per_page: PAGE_SIZE, total_count: 0, total_pages: 0 }, error: error instanceof Error ? error.message : t('list.error', { ns: 'stores' }) })
      })
    return () => controller.abort()
  }, [attempt, debouncedFilters, page, requestKey, t])

  const stores = current?.stores ?? []
  const pagination = current?.pagination
  const loading = current === null

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>{t('publicDirectory.title', { ns: 'stores' })}</Typography>
          <Typography color="text.secondary">{t('publicDirectory.description', { ns: 'stores' })}</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField fullWidth label={t('publicDirectory.search', { ns: 'stores' })} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} slotProps={{ input: { startAdornment: <SearchOutlinedIcon aria-hidden="true" fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }} />
          <TextField fullWidth label={t('publicDirectory.city', { ns: 'stores' })} value={city} onChange={(event) => { setCity(event.target.value); setPage(1) }} />
        </Stack>
        {loading ? <Box role="status" sx={{ minHeight: 160, display: 'grid', placeItems: 'center' }}><CircularProgress aria-label={t('list.loading', { ns: 'stores' })} /></Box> : current.error ? (
          <Alert severity="error" action={<Button color="inherit" startIcon={<ReplayOutlinedIcon />} onClick={() => setAttempt((value) => value + 1)}>{t('list.retry', { ns: 'stores' })}</Button>}>{current.error}</Alert>
        ) : stores.length === 0 ? <Typography role="status" color="text.secondary">{t('publicDirectory.empty', { ns: 'stores' })}</Typography> : (
          <Grid container spacing={2}>
            {stores.map((store) => (
              <Grid key={store.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea component="a" href={`/${encodeURIComponent(store.slug)}`} aria-label={t('publicDirectory.openStore', { ns: 'stores', name: store.name })} sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>{store.logo_initial || store.name.slice(0, 1)}</Avatar>
                        <Box sx={{ minWidth: 0 }}><Typography component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{store.name}</Typography><Typography color="text.secondary">{store.city}</Typography></Box>
                      </Stack>
                      {store.description && <Typography color="text.secondary" sx={{ mt: 1.5 }}>{store.description}</Typography>}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {pagination && pagination.total_pages > 1 && <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">{t('publicDirectory.pagination', { ns: 'stores', page: pagination.page, pages: pagination.total_pages, count: pagination.total_count })}</Typography>
          <Stack direction="row" spacing={1}><Button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>{t('list.previous', { ns: 'stores' })}</Button><Button disabled={loading || page >= pagination.total_pages} onClick={() => setPage((value) => value + 1)}>{t('list.next', { ns: 'stores' })}</Button></Stack>
        </Stack>}
      </Stack>
    </Container>
  )
}
