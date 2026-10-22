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
import { useAppTranslation } from '../i18n/useAppTranslation'
import type { TFunction } from 'i18next'

type Props = { accessToken: string }
type CreatedLink = { token: string; url: string }

function statusColor(status: StoreInvitation['status']): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'pending') return 'success'
  if (status === 'expired') return 'warning'
  if (status === 'revoked') return 'error'
  return 'default'
}

function formatRetry(seconds: number, t: TFunction<'invitations'>) {
  if (seconds < 60) return t('duration.seconds', { count: seconds })
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return t('duration.minutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? t('duration.hoursMinutes', { hours, minutes: remainingMinutes }) : t('duration.hours', { count: hours })
}

function formatDate(value: string, language?: string) {
  const date = new Date(value)
  const locale = language === 'en' ? 'en-US' : 'es-NI'
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function StoreInvitations({ accessToken }: Props) {
  const { t, i18n } = useAppTranslation('invitations')
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
  const [copyFailed, setCopyFailed] = useState(false)
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
      setLoadError(getErrorMessage(error, t('requestError')))
    } finally {
      setLoading(false)
    }
  }, [accessToken, t])

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
    setCopyFailed(false)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (creating || createdLink) return
    const normalizedEmail = recipientEmail.trim()
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setCreateError(t('emailInvalid'))
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
      setCreateError(getErrorMessage(error, t('requestError')))
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!createdLink) return
    try {
      await navigator.clipboard.writeText(createdLink.url)
      setCopyMessage(t('copied'))
      setCopyFailed(false)
    } catch {
      setCopyMessage(t('copyFailed'))
      setCopyFailed(true)
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
      setActionMessage(t('revokedSuccess'))
      await load()
    } catch (error) {
      setActionError(getErrorMessage(error, t('requestError')))
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
        setActionMessage(t('resendSuccess'))
      } else {
        setActionError(t('resendFailure'))
      }
      await load()
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 429 && error.retryAfterSeconds) {
        setResendCooldowns((current) => ({ ...current, [target.id]: error.retryAfterSeconds! }))
        setResendError(t('rateLimit', { time: formatRetry(error.retryAfterSeconds, t) }))
      } else {
        setResendError(getErrorMessage(error, t('requestError')))
      }
    } finally {
      setResendingId(null)
    }
  }

  function resendButton(invitation: StoreInvitation) {
    if (invitation.status === 'expired') {
      return <Button disabled title={t('renewalHelp')} sx={{ minHeight: 44 }}>{t('renewalRequired')}</Button>
    }
    if (invitation.status !== 'pending' || !invitation.recipient_email) return null

    const cooldown = resendCooldowns[invitation.id] ?? 0
    const label = cooldown > 0
      ? t('retryIn', { time: formatRetry(cooldown, t) })
      : invitation.last_delivery_status === 'failed' ? t('retryEmail') : t('resend')
    return <Button onClick={() => { setResendError(''); setResendTarget(invitation) }} disabled={resendingId !== null || cooldown > 0} sx={{ minHeight: 44 }}>{label}</Button>
  }

  const invitationRows = (cardMode: boolean) => invitations.map((invitation) => (
    cardMode ? (
      <Card key={invitation.id} variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{invitation.recipient_email || t('open')}</Typography>
              <Chip size="small" label={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? t('deliveryFailed') : t(invitation.status === 'pending' ? 'active' : invitation.status)} color={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? 'warning' : statusColor(invitation.status)} />
            </Stack>
            <Typography variant="body2" color="text.secondary">{t('created')} {formatDate(invitation.created_at, i18n.resolvedLanguage)}</Typography>
            <Typography variant="body2" color="text.secondary">{t('expires')} {formatDate(invitation.expires_at, i18n.resolvedLanguage)}</Typography>
            {resendButton(invitation)}
            {invitation.status === 'pending' && <Button startIcon={<DeleteOutlineOutlinedIcon />} color="error" onClick={() => setRevokeTarget(invitation)} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>{t('revoke')}</Button>}
          </Stack>
        </CardContent>
      </Card>
    ) : (
      <TableRow key={invitation.id}>
        <TableCell>{invitation.recipient_email || t('open')}</TableCell>
        <TableCell>{formatDate(invitation.created_at, i18n.resolvedLanguage)}</TableCell>
        <TableCell>{formatDate(invitation.expires_at, i18n.resolvedLanguage)}</TableCell>
        <TableCell><Chip size="small" label={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? t('deliveryFailed') : t(invitation.status === 'pending' ? 'active' : invitation.status)} color={invitation.status === 'pending' && invitation.last_delivery_status === 'failed' ? 'warning' : statusColor(invitation.status)} /></TableCell>
        <TableCell align="right"><Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>{resendButton(invitation)}{invitation.status === 'pending' && <IconButton aria-label={t('revokeFor', { email: invitation.recipient_email || t('open') })} color="error" onClick={() => setRevokeTarget(invitation)}><DeleteOutlineOutlinedIcon /></IconButton>}</Stack></TableCell>
      </TableRow>
    )
  ))

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box><Typography variant="h4" component="h2">{t('title')}</Typography><Typography color="text.secondary">{t('description')}</Typography></Box>
        <Button variant="contained" onClick={() => setCreateOpen(true)} sx={{ minHeight: 48, alignSelf: { xs: 'stretch', sm: 'auto' } }}>{t('new')}</Button>
      </Stack>

      {actionError && <Alert severity="error">{actionError}</Alert>}
      {actionMessage && <Alert severity="success" onClose={() => setActionMessage('')}>{actionMessage}</Alert>}
      {loading ? <Stack sx={{ py: 8, alignItems: 'center' }}><CircularProgress aria-label={t('loading')} /></Stack>
        : loadError ? <Alert severity="error" action={<Button color="inherit" onClick={() => setAttempt((value) => value + 1)}>{t('retry')}</Button>}>{t('loadError')}: {loadError}</Alert>
          : invitations.length === 0 ? <Card><CardContent sx={{ py: 5, textAlign: 'center' }}><Typography variant="h6">{t('empty')}</Typography><Typography color="text.secondary">{t('emptyHint')}</Typography></CardContent></Card>
            : mobile ? <Stack spacing={1.5}>{invitationRows(true)}</Stack>
              : <TableContainer component={Card}><Table aria-label={t('title')}><TableHead><TableRow><TableCell>{t('recipient')}</TableCell><TableCell>{t('created')}</TableCell><TableCell>{t('expires')}</TableCell><TableCell>{t('status')}</TableCell><TableCell align="right">{t('actions')}</TableCell></TableRow></TableHead><TableBody>{invitationRows(false)}</TableBody></Table></TableContainer>}

      <Dialog open={createOpen} onClose={() => { if (!creating) clearCreateDialog() }} fullWidth maxWidth="sm" aria-labelledby="new-invitation-title">
        <Box component="form" noValidate onSubmit={handleCreate}>
              <DialogTitle id="new-invitation-title">{createdLink ? t('createdTitle') : t('createTitle')}</DialogTitle>
          <DialogContent>
            {createdLink ? <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity={emailDeliveryStatus === 'failed' ? 'warning' : 'success'}>
                {emailDeliveryStatus === 'sent' && t('createdSent')}
                {emailDeliveryStatus === 'not_requested' && t('createdOpen')}
                {emailDeliveryStatus === 'failed' && t('createdFailed')}
              </Alert>
              <Alert severity="info">{t('oneStore')}</Alert>
              <TextField label={t('link')} value={createdLink.url} fullWidth slotProps={{ htmlInput: { readOnly: true } }} />
              <Button variant="outlined" startIcon={<ContentCopyOutlinedIcon />} onClick={() => void handleCopy()} sx={{ minHeight: 48 }}>{t('copy')}</Button>
              {copyMessage && <Alert severity={copyFailed ? 'error' : 'success'}>{copyMessage}</Alert>}
            </Stack> : <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="info">{t('oneStore')}</Alert>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField label={t('email')} type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} fullWidth autoComplete="email" helperText={t('emailHelp')} disabled={creating} />
            </Stack>}
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={clearCreateDialog} disabled={creating} sx={{ minHeight: 44 }}>{createdLink ? t('done') : t('cancel')}</Button>
            {!createdLink && <Button type="submit" variant="contained" disabled={creating} sx={{ minHeight: 44 }}>{creating ? <CircularProgress size={22} color="inherit" /> : t('create')}</Button>}
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onClose={() => revokingId === null && setRevokeTarget(null)} aria-labelledby="revoke-invitation-title">
        <DialogTitle id="revoke-invitation-title">{t('revokeQuestion')}</DialogTitle>
        <DialogContent><Typography>{t('revokeWarning')}</Typography></DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} disabled={revokingId !== null}>{t('cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => void handleRevoke()} disabled={revokingId !== null}>
            {revokingId !== null ? <CircularProgress size={20} color="inherit" /> : t('revoke')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resendTarget)} onClose={() => resendingId === null && setResendTarget(null)} aria-labelledby="resend-invitation-title">
        <DialogTitle id="resend-invitation-title">{t('confirmResend')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirmResendTo', { email: resendTarget?.recipient_email ?? '' })}</Typography>
          {resendError && <Alert severity="error" sx={{ mt: 2 }}>{resendError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResendTarget(null)} disabled={resendingId !== null}>{t('cancel')}</Button>
          <Button aria-label={resendingId !== null ? t('sendingInvitation') : resendTarget && (resendCooldowns[resendTarget.id] ?? 0) > 0 ? t('retryIn', { time: formatRetry(resendCooldowns[resendTarget.id], t) }) : t('resend')} variant="contained" onClick={() => void handleResend()} disabled={resendingId !== null || (resendTarget ? (resendCooldowns[resendTarget.id] ?? 0) > 0 : true)}>
            {resendingId !== null ? <CircularProgress size={20} color="inherit" /> : resendTarget && (resendCooldowns[resendTarget.id] ?? 0) > 0 ? t('retryIn', { time: formatRetry(resendCooldowns[resendTarget.id], t) }) : t('resend')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
