import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material'
import { createStoreFromInvitation, validateStoreInvitation } from '../api/stores'
import type { StoreAttributes, StoreCreationResponse } from '../api/stores'
import type { User } from '../types/auth'

const draftKey = 'storeOnboardingDraft'
const steps = ['Store identity', 'Contact information', 'Review']

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

function suggestSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeSlugInput(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
}

function errorMessages(error: unknown) {
  if (error instanceof Error) return error.message.split(', ').filter(Boolean)
  return ['Could not complete the request. Please try again.']
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
  const [invitationState, setInvitationState] = useState<'waiting' | 'loading' | 'valid' | 'invalid'>('waiting')
  const [invitationError, setInvitationError] = useState('')
  const [savedDraft, setSavedDraft] = useState<StoreDraft | null>(null)
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [draftActive, setDraftActive] = useState(false)
  const [store, setStore] = useState<StoreAttributes>(emptyStore)
  const [step, setStep] = useState(0)
  const [slugEdited, setSlugEdited] = useState(false)
  const [logoInitialEdited, setLogoInitialEdited] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [slugError, setSlugError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdStore, setCreatedStore] = useState<StoreCreationResponse['store'] | null>(null)

  useEffect(() => {
    const draft = readSavedDraft()
    setSavedDraft(draft)
    setShowDraftPrompt(Boolean(draft))
  }, [])

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
    setSavedDraft(safeDraft)
  }, [draftActive, store])

  useEffect(() => {
    let cancelled = false
    if (!user || !accessToken || !user.email_verified_at) {
      setInvitationState('waiting')
      return undefined
    }

    setInvitationState('loading')
    setInvitationError('')
    validateStoreInvitation(token, accessToken)
      .then(() => {
        if (!cancelled) setInvitationState('valid')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setInvitationState('invalid')
        setInvitationError(errorMessages(error).join(', '))
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, token, user])

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
    setSavedDraft(null)
  }

  function startNewDraft() {
    window.localStorage.removeItem(draftKey)
    setSavedDraft(null)
    setDraftActive(false)
    setShowDraftPrompt(false)
  }

  function continueStep() {
    setErrors([])
    if (step === 0 && (!store.name.trim() || !store.slug.trim())) {
      setErrors(['Store name and URL slug are required.'])
      return
    }
    if (step === 1 && !store.city.trim()) {
      setErrors(['City is required.'])
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
      setSavedDraft(null)
      setDraftActive(false)
    } catch (error) {
      const messages = errorMessages(error)
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
          <Chip color="success" label="Store created · Draft" sx={{ alignSelf: 'flex-start' }} />
          <Typography variant="h1">{createdStore.name}</Typography>
          <Typography color="text.secondary">Store address preview: {window.location.origin}/{createdStore.slug}</Typography>
          <Alert severity="info">Your store is a draft and is not publicly available yet.</Alert>
        </Stack></CardContent></Card>
      </Page>
    )
  }

  return (
    <Page>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="secondary.main">Invitation-based setup</Typography>
          <Typography variant="h1">Set up your store</Typography>
          <Typography color="text.secondary">Add your store details. You can review everything before creating it.</Typography>
        </Stack>

        {!user ? (
          <Card><CardContent><Stack spacing={2}>
            <Alert severity="info">Sign in or create an account to check this invitation. Your invitation link stays in the address bar.</Alert>
          </Stack></CardContent></Card>
        ) : !user.email_verified_at ? (
          <Alert severity="info">Verify your email first. If verification opens this page without the invitation, return to your original invitation link after verifying.</Alert>
        ) : invitationState === 'loading' ? (
          <Card><CardContent><Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><CircularProgress size={22} /><Typography>Checking invitation…</Typography></Stack></CardContent></Card>
        ) : invitationState === 'invalid' ? (
          <Alert severity="error">This invitation is invalid, expired, revoked, redeemed, or assigned to another email. {invitationError}</Alert>
        ) : invitationState === 'waiting' ? (
          <Card><CardContent><Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><CircularProgress size={22} /><Typography>Preparing invitation…</Typography></Stack></CardContent></Card>
        ) : (
          <>
            {savedDraft && showDraftPrompt && step === 0 && (
              <Alert severity="info" action={<Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                <Button color="inherit" size="small" onClick={restoreDraft}>Restore saved details</Button>
                <Button color="inherit" size="small" onClick={startNewDraft}>Start fresh</Button>
              </Stack>}>
                Saved store details are available on this device. Restore them only if they belong to the store you want to set up with this invitation.
              </Alert>
            )}
            <Stepper activeStep={step} alternativeLabel>
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
            <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Stack spacing={2.5}>
                {errors.length > 0 && <Alert severity="error">{errors.join(' ')}</Alert>}
                {step === 0 && <>
                  <Typography variant="h2">Store identity</Typography>
                  <TextField label="Store name" value={store.name} onChange={(event) => update('name', event.target.value)} required fullWidth autoComplete="organization" />
                  <TextField label="URL slug" value={store.slug} onChange={(event) => { setSlugEdited(true); update('slug', normalizeSlugInput(event.target.value)) }} onBlur={() => update('slug', suggestSlug(store.slug))} required fullWidth error={Boolean(slugError)} helperText={slugError || 'Used for your store address. You can edit the suggestion.'} slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }} />
                  <TextField label="Logo initial" value={store.logo_initial} onChange={(event) => { setLogoInitialEdited(true); update('logo_initial', event.target.value.slice(0, 1).toLocaleUpperCase()) }} slotProps={{ htmlInput: { maxLength: 1 } }} helperText="One character shown as your store mark." />
                  <TextField label="Description (optional)" value={store.description} onChange={(event) => update('description', event.target.value)} multiline minRows={3} fullWidth />
                </>}
                {step === 1 && <>
                  <Typography variant="h2">Contact information</Typography>
                  <TextField label="City" value={store.city} onChange={(event) => update('city', event.target.value)} required fullWidth autoComplete="address-level2" />
                  <TextField label="Phone or WhatsApp (optional)" value={store.phone_number} onChange={(event) => update('phone_number', event.target.value)} fullWidth type="tel" autoComplete="tel" helperText="Nicaraguan numbers are saved with the +505 country code." />
                  <TextField label="Address (optional)" value={store.address} onChange={(event) => update('address', event.target.value)} fullWidth autoComplete="street-address" />
                  <TextField label="Directions or landmark (optional)" value={store.directions} onChange={(event) => update('directions', event.target.value)} multiline minRows={2} fullWidth />
                </>}
                {step === 2 && <>
                  <Typography variant="h2">Review your store</Typography>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                    <Stack spacing={1}>
                      <Typography variant="h3">{store.logo_initial || store.name.trim().charAt(0).toLocaleUpperCase()} · {store.name}</Typography>
                      <Typography color="text.secondary">Address preview: {window.location.origin}/{store.slug}</Typography>
                      <Typography>{store.city}{store.address ? ` · ${store.address}` : ''}</Typography>
                      {store.description && <Typography>{store.description}</Typography>}
                      {store.phone_number && <Typography>{store.phone_number}</Typography>}
                      {store.directions && <Typography color="text.secondary">{store.directions}</Typography>}
                    </Stack>
                  </Box>
                  <Alert severity="info">The store will be created as a draft and will not be publicly available yet.</Alert>
                </>}
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <Button variant="text" disabled={step === 0 || submitting} onClick={() => setStep((current) => current - 1)}>Back</Button>
                  {step < 2 ? <Button variant="contained" onClick={continueStep}>Continue</Button> : <Button variant="contained" disabled={submitting} onClick={submit}>{submitting ? <CircularProgress size={22} color="inherit" /> : 'Create store'}</Button>}
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
  return <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', py: { xs: 3, sm: 5 } }}><Container maxWidth="sm">{children}</Container></Box>
}

export { suggestSlug }
