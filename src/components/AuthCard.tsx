import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import type { AuthMode, RegistrationProfile } from '../types/auth'
import { TurnstileWidget } from './TurnstileWidget'
import { TuPulperiaLogo } from './TuPulperiaLogo'
import { authCopy, type AuthLocale } from '../i18n/authCopy'

type AuthCardProps = {
  mode: AuthMode
  email: string
  password: string
  loading: boolean
  error: string | null
  success: string | null
  turnstileSiteKey: string | null
  turnstileToken: string | null
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onModeChange: (mode: AuthMode) => void
  onTurnstileTokenChange: (token: string | null) => void
  onSubmit: (event: FormEvent<HTMLFormElement>, profile?: RegistrationProfile) => void
  heading?: string
  description?: string
  customerExperience?: boolean
  locale?: AuthLocale
  onLocaleChange?: (locale: AuthLocale) => void
  registrationProfile?: RegistrationProfile
  onRegistrationProfileChange?: (profile: RegistrationProfile) => void
}

export function AuthCard({
  mode,
  email,
  password,
  loading,
  error,
  success,
  turnstileSiteKey,
  turnstileToken,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onTurnstileTokenChange,
  onSubmit,
  heading,
  description,
  customerExperience = false,
  locale = 'es',
  onLocaleChange,
  registrationProfile = { first_name: '', last_name: '', phone_number: '' },
  onRegistrationProfileChange,
}: AuthCardProps) {
  const isRegister = mode === 'register'
  const canSubmitRegister = !turnstileSiteKey || Boolean(turnstileToken)
  const copy = authCopy[locale]
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    if (customerExperience && isRegister && password !== confirmPassword) {
      event.preventDefault()
      setPasswordError(copy.passwordMismatch)
      return
    }
    setPasswordError(null)
    onSubmit(event, customerExperience && isRegister ? registrationProfile : undefined)
  }

  function updateProfile(field: keyof RegistrationProfile, value: string) {
    onRegistrationProfileChange?.({ ...registrationProfile, [field]: value })
  }

  return (
    <Card lang={locale} elevation={0} sx={{ width: '100%', maxWidth: customerExperience ? 620 : 560, mx: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          {customerExperience && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="overline" color="text.secondary">{copy.customerLabel}</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={locale}
                aria-label={copy.language}
                onChange={(_event, value: AuthLocale | null) => { if (value) onLocaleChange?.(value) }}
                sx={{ flexShrink: 0, '& .MuiToggleButton-root': { minWidth: 44, minHeight: 40, px: 1.25, fontWeight: 700 } }}
              >
                <ToggleButton value="es" aria-label="Español">ES</ToggleButton>
                <ToggleButton value="en" aria-label="English">EN</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          )}
          <Stack spacing={1.5} sx={{ textAlign: 'center' }}>
            {!customerExperience && <Chip
              icon={<TuPulperiaLogo variant="icon" size="small" alt="" sx={{ width: 18, height: 18 }} />}
              label="Tu tienda, más cerca"
              color="secondary"
              variant="outlined"
              sx={{ alignSelf: 'center', fontWeight: 700 }}
            />}
            <Typography component="h2" variant="h2" sx={{ fontSize: { xs: 25, sm: 29 }, lineHeight: 1.2 }}>
              {heading ?? (customerExperience
                ? isRegister ? copy.registerHeading : copy.signInHeading
                : isRegister ? 'Create your account' : 'Sign in')}
            </Typography>
            <Typography color="text.secondary">
              {description ?? (customerExperience
                ? isRegister ? copy.registerDescription : copy.signInDescription
                : isRegister
                  ? 'Create your account to continue with your invitation.'
                  : 'Sign in to continue with your invitation.')}
            </Typography>
          </Stack>

          {customerExperience && (
            <Tabs
              value={mode}
              onChange={(_event, value: AuthMode) => { setPasswordError(null); onModeChange(value) }}
              variant="fullWidth"
              aria-label={locale === 'es' ? 'Acceso a tu cuenta' : 'Account access'}
              sx={{ minHeight: 48, p: 0.5, borderRadius: 2, bgcolor: 'action.hover', '& .MuiTabs-indicator': { display: 'none' }, '& .MuiTab-root': { minHeight: 44, borderRadius: 1.5, textTransform: 'none', fontSize: 15, fontWeight: 650, color: 'text.secondary' }, '& .MuiTab-root.Mui-selected': { color: 'common.white', bgcolor: 'secondary.main' } }}
            >
              <Tab id="auth-tab-login" aria-controls="auth-panel" value="login" label={copy.signIn} />
              <Tab id="auth-tab-register" aria-controls="auth-panel" value="register" label={copy.createAccount} />
            </Tabs>
          )}

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {passwordError && <Alert severity="error">{passwordError}</Alert>}

          <Box component="form" id="auth-panel" role={customerExperience ? 'tabpanel' : undefined} aria-labelledby={customerExperience ? `auth-tab-${mode}` : undefined} onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
            {customerExperience && isRegister && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label={copy.firstName} autoComplete="given-name" value={registrationProfile.first_name} onChange={(event) => updateProfile('first_name', event.target.value)} required fullWidth />
                <TextField label={copy.lastName} autoComplete="family-name" value={registrationProfile.last_name} onChange={(event) => updateProfile('last_name', event.target.value)} required fullWidth />
                <TextField label={copy.phone} type="tel" autoComplete="tel" value={registrationProfile.phone_number} onChange={(event) => updateProfile('phone_number', event.target.value)} required fullWidth sx={{ gridColumn: { sm: '1 / -1' } }} />
              </Box>
            )}
            <TextField
              label={customerExperience ? copy.email : 'Email'}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label={customerExperience ? copy.password : 'Password'}
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
              fullWidth
            />
            {customerExperience && isRegister && (
              <TextField
                label={copy.confirmPassword}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(null) }}
                required
                fullWidth
              />
            )}
            {isRegister && turnstileSiteKey && (
              <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={onTurnstileTokenChange} />
            )}
            <Button type="submit" variant="contained" size="large" disabled={loading || (isRegister && !canSubmitRegister)}>
              {loading ? <CircularProgress size={22} color="inherit" /> : customerExperience ? isRegister ? copy.submitRegister : copy.submitLogin : isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </Box>

          {!customerExperience && <Button variant="text" onClick={() => onModeChange(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </Button>}
        </Stack>
      </CardContent>
    </Card>
  )
}
