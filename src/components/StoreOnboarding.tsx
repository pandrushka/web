import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material'
import { createStoreFromInvitation, validateStoreInvitation } from '../api/stores'
import { TuPulperiaLogo } from './TuPulperiaLogo'
import type { StoreAttributes, StoreCreationResponse } from '../api/stores'
import type { User } from '../types/auth'
import { useAppTranslation } from '../i18n/useAppTranslation'
import { normalizeSlugInput, suggestSlug } from './storeOnboardingUtils'

const draftKey = 'storeOnboardingDraft'

const emptyStore: StoreAttributes = {
  name: '',
  slug: '',
  logo_initial: '',
  description: '',
  phone_number: '',
  city: '',
  address: '',
  directions: '',
}

type StoreDraft = Pick<StoreAttributes, 'name' | 'slug' | 'logo_initial' | 'description' | 'city'>

type Props = {
  token: string
  user: User | null
  accessToken: string | null
}

function errorMessages(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message.split(', ').filter(Boolean)
  return [fallback]
}

function readSavedDraft(): StoreDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoreDraft>
    if (!parsed || typeof parsed !== 'object') return null
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      slug: typeof parsed.slug === 'string' ? parsed.slug : '',
      logo_initial: typeof parsed.logo_initial === 'string' ? parsed.logo_initial : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
    }
  } catch {
    return null
  }
}

export function StoreOnboarding({ token, user, accessToken }: Props) {
  const { t } = useAppTranslation('onboarding')
  const steps = [t('identity'), t('contact'), t('reviewStep')]
  const [initialDraft] = useState(() => readSavedDraft())
  const [showDraftPrompt, setShowDraftPrompt] = useState(() => Boolean(readSavedDraft()))
  const [draftActive, setDraftActive] = useState(false)
  const [store, setStore] = useState<StoreAttributes>(emptyStore)
  const [step, setStep] = useState(0)
  const [slugEdited, setSlugEdited] = useState(false)
  const [logoInitialEdited, setLogoInitialEdited] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [slugError, setSlugError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdStore, setCreatedStore] = useState<StoreCreationResponse['store'] | null>(null)
  const canValidateInvitation = Boolean(user && accessToken && user.email_verified_at)
  const invitationKey = `${token}:${user?.id ?? ''}:${accessToken ?? ''}`
  const [invitationResult, setInvitationResult] = useState<{ key: string; valid: boolean; error: string }>({ key: '', valid: false, error: '' })
  const invitationState = !canValidateInvitation ? 'waiting' : invitationResult.key !== invitationKey ? 'loading' : invitationResult.valid ? 'valid' : 'invalid'
  const invitationError = invitationResult.key === invitationKey ? invitationResult.error : ''

  const savedDraft = initialDraft

  useEffect(() => {
    if (!draftActive) return
    const safeDraft: StoreDraft = {
      name: store.name,
      slug: store.slug,
      logo_initial: store.logo_initial,
      description: store.description,
      city: store.city,
    }
    window.localStorage.setItem(draftKey, JSON.stringify(safeDraft))
  }, [draftActive, store])

  useEffect(() => {
    if (!user || !accessToken || !user.email_verified_at) {
      return undefined
    }

    let cancelled = false
    validateStoreInvitation(token, accessToken)
      .then(() => {
        if (!cancelled) setInvitationResult({ key: invitationKey, valid: true, error: '' })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setInvitationResult({ key: invitationKey, valid: false, error: errorMessages(error, t('requestError')).join(', ') })
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, invitationKey, t, token, user])

  function update<K extends keyof StoreAttributes>(field: K, value: StoreAttributes[K]) {
    setDraftActive(true)
    setShowDraftPrompt(false)
    setStore((current) => {
      const next = { ...current, [field]: value }
      if (field === 'name') {
        if (!slugEdited) next.slug = suggestSlug(value)
        if (!logoInitialEdited) next.logo_initial = value.trim().charAt(0).toLocaleUpperCase()
      }
      return next
    })
    setErrors([])
    if (field === 'slug') setSlugError('')
  }

  function restoreDraft() {
    if (!savedDraft) return
    setStore({ ...emptyStore, ...savedDraft })
    setSlugEdited(Boolean(savedDraft.slug))
    setLogoInitialEdited(Boolean(savedDraft.logo_initial))
    setShowDraftPrompt(false)
    setDraftActive(true)
  }

  function startNewDraft() {
    window.localStorage.removeItem(draftKey)
    setDraftActive(false)
    setShowDraftPrompt(false)
  }

  function continueStep() {
    setErrors([])
    if (step === 0 && (!store.name.trim() || !store.slug.trim())) {
      setErrors([t('nameSlugRequired')])
      return
    }
    if (step === 1 && !store.city.trim()) {
      setErrors([t('cityRequired')])
      return
    }
    setDraftActive(true)
    setStep((current) => current + 1)
  }

  async function submit() {
    if (!accessToken || submitting) return
    setSubmitting(true)
    setErrors([])
    setSlugError('')
    try {
      const result = await createStoreFromInvitation(token, store, accessToken)
      setCreatedStore(result.store)
      window.localStorage.removeItem(draftKey)
      setDraftActive(false)
    } catch (error) {
      const messages = errorMessages(error, t('requestError'))
      const slugValidation = messages.find((message) => /^slug\b/i.test(message) || /slug.*(reserved|taken|already)/i.test(message))
      if (slugValidation) setSlugError(slugValidation)
      setErrors(messages)
      setDraftActive(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (createdStore) {
    return (
      <Page>
        <Card><CardContent><Stack spacing={2}>
          <Chip color="success" label={`${t('created')} · ${t('draftStatus')}`} sx={{ alignSelf: 'flex-start' }} />
          <Typography variant="h1">{createdStore.name}</Typography>
          <Typography color="text.secondary">{t('storeAddress')}: {window.location.origin}/{createdStore.slug}</Typography>
          <Alert severity="info">{t('notPublic')}</Alert>
        </Stack></CardContent></Card>
      </Page>
    )
  }

  return (
    <Page>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="secondary.main">{t('eyebrow')}</Typography>
          <Typography variant="h1">{t('title')}</Typography>
          <Typography color="text.secondary">{t('description')}</Typography>
        </Stack>

        {!user ? (
          <Card><CardContent><Stack spacing={2}>
            <Alert severity="info">{t('signInToCheck')}</Alert>
          </Stack></CardContent></Card>
        ) : !user.email_verified_at ? (
          <Alert severity="info">{t('verifyFirst')}</Alert>
        ) : invitationState === 'loading' ? (
          <Card><CardContent><Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><CircularProgress size={22} /><Typography>{t('checkingInvitation')}</Typography></Stack></CardContent></Card>
        ) : invitationState === 'invalid' ? (
          <Alert severity="error">{t('invalid')}{invitationError && ` ${invitationError}`}</Alert>
        ) : invitationState === 'waiting' ? (
          <Card><CardContent><Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><CircularProgress size={22} /><Typography>{t('preparingInvitation')}</Typography></Stack></CardContent></Card>
        ) : (
          <>
            {savedDraft && showDraftPrompt && step === 0 && (
              <Alert severity="info" action={<Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                <Button color="inherit" size="small" onClick={restoreDraft}>{t('restoreDraft')}</Button>
                <Button color="inherit" size="small" onClick={startNewDraft}>{t('startFresh')}</Button>
              </Stack>}>
                {t('draftPrompt')}
              </Alert>
            )}
            <Stepper activeStep={step} alternativeLabel>
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
            <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Stack spacing={2.5}>
                {errors.length > 0 && <Alert severity="error">{errors.join(' ')}</Alert>}
                {step === 0 && <>
                  <Typography variant="h2">{t('identity')}</Typography>
                  <TextField label={t('storeName')} value={store.name} onChange={(event) => update('name', event.target.value)} required fullWidth autoComplete="organization" />
                  <TextField label={t('slug')} value={store.slug} onChange={(event) => { setSlugEdited(true); update('slug', normalizeSlugInput(event.target.value)) }} onBlur={() => update('slug', suggestSlug(store.slug))} required fullWidth error={Boolean(slugError)} helperText={slugError || t('slugHelp')} slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }} />
                  <TextField label={t('logoInitial')} value={store.logo_initial} onChange={(event) => { setLogoInitialEdited(true); update('logo_initial', event.target.value.slice(0, 1).toLocaleUpperCase()) }} slotProps={{ htmlInput: { maxLength: 1 } }} helperText={t('logoInitialHelp')} />
                  <TextField label={t('descriptionField')} value={store.description} onChange={(event) => update('description', event.target.value)} multiline minRows={3} fullWidth />
                </>}
                {step === 1 && <>
                  <Typography variant="h2">{t('contact')}</Typography>
                  <TextField label={t('city')} value={store.city} onChange={(event) => update('city', event.target.value)} required fullWidth autoComplete="address-level2" />
                  <TextField label={t('phone')} value={store.phone_number} onChange={(event) => update('phone_number', event.target.value)} fullWidth type="tel" autoComplete="tel" helperText={t('phoneHelp')} />
                  <TextField label={t('address')} value={store.address} onChange={(event) => update('address', event.target.value)} fullWidth autoComplete="street-address" />
                  <TextField label={t('directions')} value={store.directions} onChange={(event) => update('directions', event.target.value)} multiline minRows={2} fullWidth />
                </>}
                {step === 2 && <>
                  <Typography variant="h2">{t('review')}</Typography>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                    <Stack spacing={1}>
                      <Typography variant="h3">{store.logo_initial || store.name.trim().charAt(0).toLocaleUpperCase()} · {store.name}</Typography>
                      <Typography color="text.secondary">{t('storeAddress')}: {window.location.origin}/{store.slug}</Typography>
                      <Typography>{store.city}{store.address ? ` · ${store.address}` : ''}</Typography>
                      {store.description && <Typography>{store.description}</Typography>}
                      {store.phone_number && <Typography>{store.phone_number}</Typography>}
                      {store.directions && <Typography color="text.secondary">{store.directions}</Typography>}
                    </Stack>
                  </Box>
                  <Alert severity="info">{t('draftNotice')}</Alert>
                </>}
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <Button variant="text" disabled={step === 0 || submitting} onClick={() => setStep((current) => current - 1)}>{t('back')}</Button>
                  {step < 2 ? <Button variant="contained" onClick={continueStep}>{t('continue')}</Button> : <Button variant="contained" disabled={submitting} onClick={submit}>{submitting ? <CircularProgress size={22} color="inherit" /> : t('create')}</Button>}
                </Stack>
              </Stack>
            </CardContent></Card>
          </>
        )}
      </Stack>
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', py: { xs: 3, sm: 5 } }}><Container maxWidth="sm"><Box sx={{ mb: { xs: 3, sm: 4 } }}><TuPulperiaLogo variant="horizontal" size="small" /></Box>{children}</Container></Box>
}
