import { useEffect, useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { fetchAdminStore, fetchStore, publishStore, unpublishStore, updateStore } from '../api/stores'
import type { StoreMembershipRole, StoreProfile } from '../api/stores'
import { StoreDetailsCard } from './StoreDetailsCard'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import { StorefrontPreview } from '../features/storefront/components/StorefrontPreview'
import type { ImageTokenRefresh } from '../api/productImages'

type Props = {
  storeId: number
  accessToken: string
  source: 'member' | 'platform'
  editable: boolean
  onBack?: () => void
  backLabel?: string
  onStoreUpdated: (store: StoreProfile) => void
  cacheScope?: string
  refreshAccessToken?: ImageTokenRefresh
  membershipRole?: StoreMembershipRole | string | null
}

function errorKind(message: string) {
  if (/forbidden|not authorized/i.test(message)) return 'forbidden'
  if (/store not found|request failed with 404/i.test(message)) return 'not-found'
  return 'error'
}

export function StoreDetailsPanel({ storeId, accessToken, source, editable, onBack, backLabel = 'Back to All Stores', onStoreUpdated, cacheScope, refreshAccessToken, membershipRole }: Props) {
  const [store, setStore] = useState<StoreProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [transitionTarget, setTransitionTarget] = useState<'publish' | 'unpublish' | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [publicationMessage, setPublicationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const onStoreUpdatedRef = useRef(onStoreUpdated)

  useEffect(() => { onStoreUpdatedRef.current = onStoreUpdated }, [onStoreUpdated])

  useEffect(() => {
    let cancelled = false
    setStore(null)
    setPreviewing(false)
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

  async function confirmPublication() {
    if (!store || !transitionTarget || transitioning) return
    setTransitioning(true)
    setPublicationMessage(null)
    try {
      const response = transitionTarget === 'publish'
        ? await publishStore(accessToken, store.id)
        : await unpublishStore(accessToken, store.id)
      setStore(response.store)
      onStoreUpdated(response.store)
      setPublicationMessage({ type: 'success', text: transitionTarget === 'publish' ? 'Store published.' : 'Store unpublished.' })
      setTransitionTarget(null)
    } catch (requestError) {
      setPublicationMessage({ type: 'error', text: requestError instanceof Error ? requestError.message : 'Could not update publication status.' })
      setTransitionTarget(null)
    } finally {
      setTransitioning(false)
    }
  }

  async function copyStoreLink() {
    if (!store) return
    const url = `${window.location.origin}/${encodeURIComponent(store.slug)}`
    try {
      await navigator.clipboard.writeText(url)
      setPublicationMessage({ type: 'success', text: 'Store link copied.' })
    } catch {
      setPublicationMessage({ type: 'error', text: 'Could not copy the store link. Please copy it from your browser address bar.' })
    }
  }

  const kind = error ? errorKind(error) : null

  if (previewing && store) return <StorefrontPreview store={store} accessToken={accessToken} catalogSource={editable ? 'member' : 'platform'} cacheScope={cacheScope} refreshAccessToken={refreshAccessToken} onReturn={() => setPreviewing(false)} />

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
        <>
          {publicationMessage && <Alert severity={publicationMessage.type} role={publicationMessage.type === 'success' ? 'status' : 'alert'} onClose={() => setPublicationMessage(null)}>{publicationMessage.text}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
            {(source === 'member' || membershipRole === 'owner') && (store.membership?.role === 'owner' || membershipRole === 'owner') && store.status !== 'suspended' && (
              <Button variant="contained" disabled={transitioning} onClick={() => setTransitionTarget(store.status === 'draft' ? 'publish' : 'unpublish')} sx={{ minHeight: 48 }}>
                {store.status === 'draft' ? 'Publish Store' : 'Unpublish Store'}
              </Button>
            )}
            {store.status === 'active' && <>
              <Button startIcon={<ContentCopyOutlinedIcon />} variant="outlined" onClick={() => void copyStoreLink()} sx={{ minHeight: 48 }}>Copy Store Link</Button>
              <Button startIcon={<OpenInNewOutlinedIcon />} variant="outlined" component="a" href={`/${encodeURIComponent(store.slug)}`} target="_blank" rel="noreferrer" sx={{ minHeight: 48 }}>Open Public Store</Button>
            </>}
          </Stack>
          {(source === 'platform' || editable) && <Button startIcon={<VisibilityOutlinedIcon />} variant="outlined" onClick={() => setPreviewing(true)} sx={{ alignSelf: 'flex-start', minHeight: 48 }}>Preview Store</Button>}
          <StoreDetailsCard key={`${store.id}-${source}`} store={store} editable={editable} onSave={saveStore} onStoreUpdated={(updated) => { setStore(updated); onStoreUpdated(updated) }} />
          <Dialog open={transitionTarget !== null} onClose={() => { if (!transitioning) setTransitionTarget(null) }} aria-labelledby="publication-confirm-title">
            <DialogTitle id="publication-confirm-title">{transitionTarget === 'publish' ? 'Publish this store?' : 'Unpublish this store?'}</DialogTitle>
            <DialogContent>
              <Typography>{transitionTarget === 'publish' ? 'Customers will be able to visit this store at its public link.' : 'Customers will no longer be able to visit this store. You can publish it again later.'}</Typography>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap', px: 3, pb: 2 }}>
              <Button onClick={() => setTransitionTarget(null)} disabled={transitioning} sx={{ minHeight: 44 }}>Cancel</Button>
              <Button onClick={() => void confirmPublication()} disabled={transitioning} variant="contained" sx={{ minHeight: 44 }}>{transitioning ? 'Updating…' : transitionTarget === 'publish' ? 'Publish Store' : 'Unpublish Store'}</Button>
            </DialogActions>
          </Dialog>
        </>
      ) : null}
    </Stack>
  )
}
