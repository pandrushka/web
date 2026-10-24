import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { fetchAdminStore, fetchStore, publishStore, unpublishStore, updateStore } from '../api/stores'
import type { StoreMembershipRole, StoreProfile } from '../api/stores'
import { ApiRequestError } from '../api/client'
import { StoreDetailsCard } from './StoreDetailsCard'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import { StorefrontPreview } from '../features/storefront/components/StorefrontPreview'
import type { ImageTokenRefresh } from '../api/productImages'
import { useAppTranslation } from '../i18n/useAppTranslation'

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

export function StoreDetailsPanel({ storeId, accessToken, source, editable, onBack, backLabel, onStoreUpdated, cacheScope, refreshAccessToken, membershipRole }: Props) {
  const { t } = useAppTranslation(['stores', 'common'])
  const [loadState, setLoadState] = useState<{ key: string; store: StoreProfile | null; error: string | null }>({ key: '', store: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const [previewingKey, setPreviewingKey] = useState<string | null>(null)
  const [transitionSelection, setTransitionSelection] = useState<{ scope: string; target: 'publish' | 'unpublish' } | null>(null)
  const [transitionState, setTransitionState] = useState<{ scope: string; id: number } | null>(null)
  const [publicationMessageState, setPublicationMessageState] = useState<{ scope: string; type: 'success' | 'error'; text: string; refreshError?: string } | null>(null)
  const publicationScope = `${source}:${storeId}:${cacheScope ?? accessToken}`
  const transitionTarget = transitionSelection?.scope === publicationScope ? transitionSelection.target : null
  const transitioning = transitionState?.scope === publicationScope
  const publicationMessage = publicationMessageState?.scope === publicationScope ? publicationMessageState : null
  if (transitionState && transitionState.scope !== publicationScope) setTransitionState(null)
  const activePublicationScopeRef = useRef(publicationScope)
  const pendingPublicationRef = useRef<{ scope: string; id: number } | null>(null)
  const publicationSequenceRef = useRef(0)
  const onStoreUpdatedRef = useRef(onStoreUpdated)
  const requestKey = `${source}:${storeId}:${accessToken}:${attempt}`
  const currentLoad = loadState.key === requestKey ? loadState : null
  const store = currentLoad?.store ?? null
  const error = currentLoad?.error ?? null
  const loading = currentLoad === null
  const previewing = previewingKey === requestKey && store !== null

  useEffect(() => { onStoreUpdatedRef.current = onStoreUpdated }, [onStoreUpdated])

  useLayoutEffect(() => {
    activePublicationScopeRef.current = publicationScope
    if (pendingPublicationRef.current?.scope !== publicationScope) pendingPublicationRef.current = null
  }, [publicationScope])

  useEffect(() => {
    let cancelled = false
    const request = source === 'member' ? fetchStore(accessToken, storeId) : fetchAdminStore(accessToken, storeId)
    void request.then(({ store: fetchedStore }) => {
      if (cancelled) return
      setLoadState({ key: requestKey, store: fetchedStore, error: null })
      onStoreUpdatedRef.current(fetchedStore)
    }).catch((requestError: unknown) => {
      if (!cancelled) setLoadState({ key: requestKey, store: null, error: requestError instanceof Error ? requestError.message : t('details.error', { ns: 'stores' }) })
    })
    return () => { cancelled = true }
  }, [accessToken, attempt, requestKey, source, storeId, t])

  async function saveStore(id: number, changes: Parameters<typeof updateStore>[2]) {
    const { store: updated } = await updateStore(accessToken, id, changes)
    return updated
  }

  async function confirmPublication() {
    if (!store || !transitionTarget || pendingPublicationRef.current?.scope === publicationScope) return
    const operationId = ++publicationSequenceRef.current
    pendingPublicationRef.current = { scope: publicationScope, id: operationId }
    setTransitionState({ scope: publicationScope, id: operationId })
    setPublicationMessageState(null)
    const isCurrentOperation = () => activePublicationScopeRef.current === publicationScope &&
      pendingPublicationRef.current?.id === operationId

    try {
      const response = transitionTarget === 'publish'
        ? await publishStore(accessToken, store.id)
        : await unpublishStore(accessToken, store.id)
      if (!isCurrentOperation()) return
      setLoadState({ key: requestKey, store: response.store, error: null })
      onStoreUpdated(response.store)
      setPublicationMessageState({ scope: publicationScope, type: 'success', text: transitionTarget === 'publish' ? t('publication.published', { ns: 'stores' }) : t('publication.unpublished', { ns: 'stores' }) })
      setTransitionSelection(null)
    } catch (requestError) {
      if (!isCurrentOperation()) return
      const message = requestError instanceof Error ? requestError.message : t('publication.error', { ns: 'stores' })
      if (requestError instanceof ApiRequestError && requestError.status === 409) {
        try {
          const { store: refreshedStore } = await fetchStore(accessToken, store.id)
          if (!isCurrentOperation()) return
          setLoadState({ key: requestKey, store: refreshedStore, error: null })
          onStoreUpdated(refreshedStore)
          setPublicationMessageState({ scope: publicationScope, type: 'error', text: message })
        } catch {
          if (!isCurrentOperation()) return
          setPublicationMessageState({
            scope: publicationScope,
            type: 'error',
            text: message,
            refreshError: t('publication.refreshFailed', { ns: 'stores' }),
          })
        }
      } else {
        setPublicationMessageState({ scope: publicationScope, type: 'error', text: message })
      }
      setTransitionSelection(null)
    } finally {
      if (isCurrentOperation()) {
        pendingPublicationRef.current = null
        setTransitionState((current) => current?.id === operationId ? null : current)
      }
    }
  }

  async function copyStoreLink() {
    if (!store) return
    const url = `${window.location.origin}/${encodeURIComponent(store.slug)}`
    try {
      await navigator.clipboard.writeText(url)
      setPublicationMessageState({ scope: publicationScope, type: 'success', text: t('publication.copied', { ns: 'stores' }) })
    } catch {
      setPublicationMessageState({ scope: publicationScope, type: 'error', text: t('publication.copyError', { ns: 'stores' }) })
    }
  }

  const kind = error ? errorKind(error) : null

  if (previewing && store) return <StorefrontPreview store={store} accessToken={accessToken} catalogSource={editable ? 'member' : 'platform'} cacheScope={cacheScope} refreshAccessToken={refreshAccessToken} onReturn={() => setPreviewingKey(null)} />

  return (
    <Stack spacing={2.5}>
      {onBack && <Button onClick={onBack} sx={{ alignSelf: 'flex-start', minHeight: 48 }}>{backLabel ?? t('details.backToStores', { ns: 'stores' })}</Button>}
      <Typography variant="h4" component="h2">{t('details.title', { ns: 'stores' })}</Typography>
      {loading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={24} aria-label={t('details.loading', { ns: 'stores' })} /><Typography color="text.secondary">{t('details.loading', { ns: 'stores' })}</Typography></Stack>
      ) : error ? (
        <Alert severity={kind === 'error' ? 'error' : 'warning'} action={kind === 'error' ? <Button color="inherit" size="small" onClick={() => setAttempt((value) => value + 1)}>{t('list.retry', { ns: 'stores' })}</Button> : undefined}>
          {kind === 'forbidden' ? t('details.forbidden', { ns: 'stores' }) : kind === 'not-found' ? t('details.notFound', { ns: 'stores' }) : error}
        </Alert>
      ) : store ? (
        <>
          {publicationMessage && <Alert severity={publicationMessage.type} role={publicationMessage.type === 'success' ? 'status' : 'alert'} onClose={() => setPublicationMessageState(null)}>
            {publicationMessage.text}
            {publicationMessage.refreshError && <Typography component="span"> {publicationMessage.refreshError}</Typography>}
          </Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
            {(source === 'member' || membershipRole === 'owner') && (store.membership?.role === 'owner' || membershipRole === 'owner') && store.status !== 'suspended' && (
              <Button variant="contained" disabled={transitioning} onClick={() => setTransitionSelection({ scope: publicationScope, target: store.status === 'draft' ? 'publish' : 'unpublish' })} sx={{ minHeight: 48 }}>
                {store.status === 'draft' ? t('publication.publish', { ns: 'stores' }) : t('publication.unpublish', { ns: 'stores' })}
              </Button>
            )}
            {store.status === 'active' && <>
              <Button startIcon={<ContentCopyOutlinedIcon />} variant="outlined" onClick={() => void copyStoreLink()} sx={{ minHeight: 48 }}>{t('publication.copyLink', { ns: 'stores' })}</Button>
              <Button startIcon={<OpenInNewOutlinedIcon />} variant="outlined" component="a" href={`/${encodeURIComponent(store.slug)}`} target="_blank" rel="noreferrer" sx={{ minHeight: 48 }}>{t('publication.openPublic', { ns: 'stores' })}</Button>
            </>}
          </Stack>
          {(source === 'platform' || editable) && <Button startIcon={<VisibilityOutlinedIcon />} variant="outlined" onClick={() => setPreviewingKey(requestKey)} sx={{ alignSelf: 'flex-start', minHeight: 48 }}>{t('details.preview', { ns: 'stores' })}</Button>}
          <StoreDetailsCard key={`${store.id}-${source}`} store={store} editable={editable} onSave={saveStore} onStoreUpdated={(updated) => { setLoadState({ key: requestKey, store: updated, error: null }); onStoreUpdated(updated) }} />
          <Dialog open={transitionTarget !== null} onClose={() => { if (!transitioning) setTransitionSelection(null) }} aria-labelledby="publication-confirm-title">
            <DialogTitle id="publication-confirm-title">{transitionTarget === 'publish' ? t('publication.confirmPublish', { ns: 'stores' }) : t('publication.confirmUnpublish', { ns: 'stores' })}</DialogTitle>
            <DialogContent>
              <Typography>{transitionTarget === 'publish' ? t('publication.publishHelp', { ns: 'stores' }) : t('publication.unpublishHelp', { ns: 'stores' })}</Typography>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap', px: 3, pb: 2 }}>
              <Button onClick={() => setTransitionSelection(null)} disabled={transitioning} sx={{ minHeight: 44 }}>{t('details.cancel', { ns: 'stores' })}</Button>
              <Button onClick={() => void confirmPublication()} disabled={transitioning} variant="contained" sx={{ minHeight: 44 }}>{transitioning ? t('publication.updating', { ns: 'stores' }) : transitionTarget === 'publish' ? t('publication.publish', { ns: 'stores' }) : t('publication.unpublish', { ns: 'stores' })}</Button>
            </DialogActions>
          </Dialog>
        </>
      ) : null}
    </Stack>
  )
}
