import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, IconButton, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
  useMediaQuery,
} from '@mui/material'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { useTheme } from '@mui/material/styles'
import { ApiRequestError } from '../api/client'
import { createStoreInvitation, fetchStoreInvitations, resendStoreInvitation, revokeStoreInvitation } from '../api/storeInvitations'
import type { InvitationEmailDeliveryStatus, StoreInvitation } from '../api/storeInvitations'

type Props = { accessToken: string }
type CreatedLink = { token: string; url: string }

function statusLabel(status: StoreInvitation['status']) {
  return status === 'pending' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1)
}

function statusColor(status: StoreInvitation['status']): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'pending') return 'success'
  if (status === 'expired') return 'warning'
  if (status === 'revoked') return 'error'
  return 'default'
}

function formatRetry(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function StoreInvitations({ accessToken }: Props) {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [invitations, setInvitations] = useState<StoreInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null)
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<InvitationEmailDeliveryStatus | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<StoreInvitation | null>(null)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [resendTarget, setResendTarget] = useState<StoreInvitation | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const [resendCooldowns, setResendCooldowns] = useState<Record<number, number>>({})
  const [resendError, setResendError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetchStoreInvitations(accessToken)
      setInvitations(response.invitations)
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { void load() }, [attempt, load])

  useEffect(() => {
    if (Object.keys(resendCooldowns).length === 0) return undefined
    const timer = window.setInterval(() => {
      setResendCooldowns((current) => Object.fromEntries(
        Object.entries(current)
          .map(([id, seconds]) => [Number(id), seconds - 1] as const)
          .filter(([, seconds]) => seconds > 0),
      ))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldowns])

  function clearCreateDialog() {
    setCreateOpen(false)
    setRecipientEmail('')
    setCreateError('')
    setCreating(false)
    setCreatedLink(null)
    setEmailDeliveryStatus(null)
    setCopyMessage('')
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (creating || createdLink) return
    const normalizedEmail = recipientEmail.trim()
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setCreateError('Enter a valid email address or leave this field blank.')
      return
    }
    setCreateError('')
    setCreating(true)
    try {
      const response = await createStoreInvitation(accessToken, normalizedEmail || undefined)
      setCreatedLink({ token: response.token, url: `${window.location.origin}/invite/${encodeURIComponent(response.token)}` })
      setEmailDeliveryStatus(response.email_delivery_status ?? (normalizedEmail ? 'failed' : 'not_requested'))
      await load()
    } catch (error) {
      setCreateError(getErrorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!createdLink) return
    try {
      await navigator.clipboard.writeText(createdLink.url)
      setCopyMessage('Invitation link copied.')
    } catch {
      setCopyMessage('Could not copy the link. Select and copy it manually.')
    }
  }

  async function handleRevoke() {
    if (!revokeTarget || revokeTarget.status !== 'pending' || revokingId !== null) return
    const target = revokeTarget
    setRevokingId(target.id)
    setActionError('')
    setActionMessage('')
    try {
      await revokeStoreInvitation(accessToken, target.id)
      setRevokeTarget(null)
      setActionMessage('Invitation revoked.')
      await load()
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setRevokingId(null)
    }
  }

  async function handleResend() {
    if (!resendTarget || resendTarget.status !== 'pending' || !resendTarget.recipient_email || resendingId !== null) return
    const target = resendTarget
    const cooldown = resendCooldowns[target.id] ?? 0
    if (cooldown > 0) return

    setResendingId(target.id)
    setResendError('')
    setActionMessage('')
    try {
      const response = await resendStoreInvitation(accessToken, target.id)
      setResendTarget(null)
      if (response.email_delivery_status === 'sent') {
        setActionMessage('La invitación se ha enviado nuevamente.')
      } else {
        setActionError('No se pudo enviar el correo. Inténtalo de nuevo.')
      }
      await load()
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 429 && error.retryAfterSeconds) {
        setResendCooldowns((current) => ({ ...current, [target.id]: error.retryAfterSeconds! }))
        setResendError(`Límite de reenvíos alcanzado. Intenta de nuevo en ${formatRetry(error.retryAfterSeconds)}.`)
      } else {
        setResendError(getErrorMessage(error))
      }
    } finally {
      setResendingId(null)
    }
  }

  function resendButton(invitation: StoreInvitation) {
    if (invitation.status === 'expired') {
      return <Button disabled title="Renewal is required before this invitation can be resent." sx={{ minHeight: 44 }}>Renewal required</Button>
    }
    if (invitation.status !== 'pending' || !invitation.recipient_email) return null

    const cooldown = resendCooldowns[invitation.id] ?? 0
    const label = cooldown > 0
      ? `Retry in ${formatRetry(cooldown)}`
      : invitation.last_delivery_status === 'failed' ? 'Retry Email' : 'Resend Invitation'
    return <Button onClick={() => { setResendError(''); setResendTarget(invitation) }} disabled={resendingId !== null || cooldown > 0} sx={{ minHeight: 44 }}>{label}</Button>
  }

  const invitationRows = (cardMode: boolean) => invitations.map((invitation) => (
    cardMode ? (
      <Card key={invitation.id} variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{invitation.recipient_email || 'Open invitation'}</Typography>
              <Chip size="small" label={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? 'Delivery failed' : statusLabel(invitation.status)} color={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? 'warning' : statusColor(invitation.status)} />
            </Stack>
            <Typography variant="body2" color="text.secondary">Created {formatDate(invitation.created_at)}</Typography>
            <Typography variant="body2" color="text.secondary">Expires {formatDate(invitation.expires_at)}</Typography>
            {resendButton(invitation)}
            {invitation.status === 'pending' && <Button startIcon={<DeleteOutlineOutlinedIcon />} color="error" onClick={() => setRevokeTarget(invitation)} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>Revoke</Button>}
          </Stack>
        </CardContent>
      </Card>
    ) : (
      <TableRow key={invitation.id}>
        <TableCell>{invitation.recipient_email || 'Open invitation'}</TableCell>
        <TableCell>{formatDate(invitation.created_at)}</TableCell>
        <TableCell>{formatDate(invitation.expires_at)}</TableCell>
        <TableCell><Chip size="small" label={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? 'Delivery failed' : statusLabel(invitation.status)} color={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? 'warning' : statusColor(invitation.status)} /></TableCell>
        <TableCell align="right"><Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>{resendButton(invitation)}{invitation.status === 'pending' && <IconButton aria-label={`Revoke invitation for ${invitation.recipient_email || 'Open invitation'}`} color="error" onClick={() => setRevokeTarget(invitation)}><DeleteOutlineOutlinedIcon /></IconButton>}</Stack></TableCell>
      </TableRow>
    )
  ))

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box><Typography variant="h4" component="h2">Store invitations</Typography><Typography color="text.secondary">Create and manage invitations for new store owners.</Typography></Box>
        <Button variant="contained" onClick={() => setCreateOpen(true)} sx={{ minHeight: 48, alignSelf: { xs: 'stretch', sm: 'auto' } }}>New Invitation</Button>
      </Stack>

      {actionError && <Alert severity="error">{actionError}</Alert>}
      {actionMessage && <Alert severity="success" onClose={() => setActionMessage('')}>{actionMessage}</Alert>}
      {loading ? <Stack sx={{ py: 8, alignItems: 'center' }}><CircularProgress aria-label="Loading invitations" /></Stack>
        : loadError ? <Alert severity="error" action={<Button color="inherit" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>}>Could not load invitations: {loadError}</Alert>
          : invitations.length === 0 ? <Card><CardContent sx={{ py: 5, textAlign: 'center' }}><Typography variant="h6">No invitations yet</Typography><Typography color="text.secondary">Create an invitation to get started.</Typography></CardContent></Card>
            : mobile ? <Stack spacing={1.5}>{invitationRows(true)}</Stack>
              : <TableContainer component={Card}><Table aria-label="Store invitations"><TableHead><TableRow><TableCell>Recipient</TableCell><TableCell>Created</TableCell><TableCell>Expires</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{invitationRows(false)}</TableBody></Table></TableContainer>}

      <Dialog open={createOpen} onClose={() => { if (!creating) clearCreateDialog() }} fullWidth maxWidth="sm" aria-labelledby="new-invitation-title">
        <Box component="form" noValidate onSubmit={handleCreate}>
          <DialogTitle id="new-invitation-title">{createdLink ? 'Invitation created' : 'Create store invitation'}</DialogTitle>
          <DialogContent>
            {createdLink ? <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity={emailDeliveryStatus === 'failed' ? 'warning' : 'success'}>
                {emailDeliveryStatus === 'sent' && 'Invitación creada y correo enviado.'}
                {emailDeliveryStatus === 'not_requested' && 'Invitación creada. Copia el enlace para compartirlo.'}
                {emailDeliveryStatus === 'failed' && 'La invitación fue creada, pero no se pudo enviar el correo. Puedes copiar el enlace y compartirlo manualmente.'}
              </Alert>
              <Alert severity="info">This invitation can be used once to create one store. It expires in seven days.</Alert>
              <TextField label="Invitation link" value={createdLink.url} fullWidth slotProps={{ htmlInput: { readOnly: true } }} />
              <Button variant="outlined" startIcon={<ContentCopyOutlinedIcon />} onClick={() => void handleCopy()} sx={{ minHeight: 48 }}>Copy Link</Button>
              {copyMessage && <Alert severity={copyMessage.startsWith('Invitation') ? 'success' : 'error'}>{copyMessage}</Alert>}
            </Stack> : <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="info">One invitation creates one store and expires after seven days. Share the generated link manually.</Alert>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField label="Recipient email (optional)" type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} fullWidth autoComplete="email" helperText="Leave blank for an open invitation." disabled={creating} />
            </Stack>}
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={clearCreateDialog} disabled={creating} sx={{ minHeight: 44 }}>{createdLink ? 'Done' : 'Cancel'}</Button>
            {!createdLink && <Button type="submit" variant="contained" disabled={creating} sx={{ minHeight: 44 }}>{creating ? <CircularProgress size={22} color="inherit" /> : 'Create invitation'}</Button>}
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onClose={() => revokingId === null && setRevokeTarget(null)} aria-labelledby="revoke-invitation-title">
        <DialogTitle id="revoke-invitation-title">Revoke invitation?</DialogTitle>
        <DialogContent><Typography>This invitation will no longer be usable.</Typography></DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} disabled={revokingId !== null}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleRevoke()} disabled={revokingId !== null}>
            {revokingId !== null ? <CircularProgress size={20} color="inherit" /> : 'Revoke invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resendTarget)} onClose={() => resendingId === null && setResendTarget(null)} aria-labelledby="resend-invitation-title">
        <DialogTitle id="resend-invitation-title">Resend invitation?</DialogTitle>
        <DialogContent>
          <Typography>¿Deseas reenviar esta invitación a {resendTarget?.recipient_email}?</Typography>
          {resendError && <Alert severity="error" sx={{ mt: 2 }}>{resendError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResendTarget(null)} disabled={resendingId !== null}>Cancel</Button>
          <Button aria-label={resendingId !== null ? 'Sending invitation' : resendTarget && (resendCooldowns[resendTarget.id] ?? 0) > 0 ? `Reintentar en ${formatRetry(resendCooldowns[resendTarget.id])}` : 'Reenviar invitación'} variant="contained" onClick={() => void handleResend()} disabled={resendingId !== null || (resendTarget ? (resendCooldowns[resendTarget.id] ?? 0) > 0 : true)}>
            {resendingId !== null ? <CircularProgress size={20} color="inherit" /> : resendTarget && (resendCooldowns[resendTarget.id] ?? 0) > 0 ? `Reintentar en ${formatRetry(resendCooldowns[resendTarget.id])}` : 'Reenviar invitación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
