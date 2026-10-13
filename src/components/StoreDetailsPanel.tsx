import { useEffect, useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { fetchAdminStore, fetchStore, updateStore } from '../api/stores'
import type { StoreProfile } from '../api/stores'
import { StoreDetailsCard } from './StoreDetailsCard'

type Props = {
  storeId: number
  accessToken: string
  source: 'member' | 'platform'
  editable: boolean
  onBack?: () => void
  backLabel?: string
  onStoreUpdated: (store: StoreProfile) => void
}

function errorKind(message: string) {
  if (/forbidden|not authorized/i.test(message)) return 'forbidden'
  if (/store not found|request failed with 404/i.test(message)) return 'not-found'
  return 'error'
}

export function StoreDetailsPanel({ storeId, accessToken, source, editable, onBack, backLabel = 'Back to All Stores', onStoreUpdated }: Props) {
  const [store, setStore] = useState<StoreProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const onStoreUpdatedRef = useRef(onStoreUpdated)

  useEffect(() => { onStoreUpdatedRef.current = onStoreUpdated }, [onStoreUpdated])

  useEffect(() => {
    let cancelled = false
    setStore(null)
    setLoading(true)
    setError(null)
    const request = source === 'member' ? fetchStore(accessToken, storeId) : fetchAdminStore(accessToken, storeId)
    void request.then(({ store: fetchedStore }) => {
      if (cancelled) return
      setStore(fetchedStore)
      onStoreUpdatedRef.current(fetchedStore)
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not load store details.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [accessToken, attempt, source, storeId])

  async function saveStore(id: number, changes: Parameters<typeof updateStore>[2]) {
    const { store: updated } = await updateStore(accessToken, id, changes)
    return updated
  }

  const kind = error ? errorKind(error) : null

  return (
    <Stack spacing={2.5}>
      {onBack && <Button onClick={onBack} sx={{ alignSelf: 'flex-start', minHeight: 48 }}>{backLabel}</Button>}
      <Typography variant="h4" component="h2">Store details</Typography>
      {loading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={24} aria-label="Loading store details" /><Typography color="text.secondary">Loading store details…</Typography></Stack>
      ) : error ? (
        <Alert severity={kind === 'error' ? 'error' : 'warning'} action={kind === 'error' ? <Button color="inherit" size="small" onClick={() => setAttempt((value) => value + 1)}>Retry</Button> : undefined}>
          {kind === 'forbidden' ? 'You do not have permission to view this store.' : kind === 'not-found' ? 'This store could not be found.' : error}
        </Alert>
      ) : store ? (
        <StoreDetailsCard key={`${store.id}-${source}`} store={store} editable={editable} onSave={saveStore} onStoreUpdated={(updated) => { setStore(updated); onStoreUpdated(updated) }} />
      ) : null}
    </Stack>
  )
}
