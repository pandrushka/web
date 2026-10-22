import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from '@mui/material'
import { login, refreshAuth, register, resendVerificationEmail, verifyEmail } from './api/auth'
import { fetchMyStores } from './api/stores'
import type { StoreProfile } from './api/stores'
import type { DashboardContext, DashboardSection, StoreRole } from './components/DashboardLayout'
import { LandingPage } from './components/LandingPage'
import { PendingVerificationPanel } from './components/PendingVerificationPanel'
import type { AuthMode, RegistrationProfile, User } from './types/auth'
import { useAppTranslation } from './i18n/useAppTranslation'
import { authSessionKey, clearAuthSession, loadAuthSession, saveAuthSession } from './utils/authSession'
import { isPlatformAdmin } from './utils/auth'
import type { ImageTokenRefresh } from './api/productImages'
import { clearProductImageCache } from './api/productImages'
import { publicStoreSlugFromPath } from './utils/appRoutes'
import i18n from './i18n'

const AuthCard = lazy(() => import('./components/AuthCard').then(({ AuthCard: component }) => ({ default: component })))
const DashboardLayout = lazy(() => import('./components/DashboardLayout').then(({ DashboardLayout: component }) => ({ default: component })))
const StoreDirectory = lazy(() => import('./components/StoreDirectory').then(({ StoreDirectory: component }) => ({ default: component })))
const StoreOnboarding = lazy(() => import('./components/StoreOnboarding').then(({ StoreOnboarding: component }) => ({ default: component })))
const StoreDetailsPanel = lazy(() => import('./components/StoreDetailsPanel').then(({ StoreDetailsPanel: component }) => ({ default: component })))
const StoreInvitations = lazy(() => import('./components/StoreInvitations').then(({ StoreInvitations: component }) => ({ default: component })))
const StoreCatalogManagement = lazy(() => import('./features/catalog/StoreCatalogManagement').then(({ StoreCatalogManagement: component }) => ({ default: component })))
const PublicStorefrontRoute = lazy(() => import('./features/storefront/PublicStorefrontRoute').then(({ PublicStorefrontRoute: component }) => ({ default: component })))

function ScreenLoading() {
  const { t } = useAppTranslation('common')
  return <Box sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}><CircularProgress aria-label={t('actions.loading')} /></Box>
}

function SectionLoading() {
  const { t } = useAppTranslation('common')
  return <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}><CircularProgress aria-label={t('actions.loading')} /></Box>
}

function App() {
  const { t } = useAppTranslation(['common', 'auth', 'dashboard', 'onboarding'])
  const [mode, setMode] = useState<AuthMode>('login')
  const [activeSection, setActiveSection] = useState<DashboardSection>('dashboard')
  const [dashboardContext, setDashboardContext] = useState<DashboardContext>('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registrationProfile, setRegistrationProfile] = useState<RegistrationProfile>({ first_name: '', last_name: '', phone_number: '' })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [myStores, setMyStores] = useState<StoreProfile[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [selectedPlatformStore, setSelectedPlatformStore] = useState<StoreProfile | null>(null)
  const [memberStoresResolved, setMemberStoresResolved] = useState(false)
  const [memberStoresError, setMemberStoresError] = useState<string | null>(null)
  const [memberStoresAttempt, setMemberStoresAttempt] = useState(0)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [pendingNotice, setPendingNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [invitationContextMissing, setInvitationContextMissing] = useState(false)
  const imageRefreshPromise = useRef<Promise<string> | null>(null)
  const invitationToken = readInvitationToken(window.location.pathname)
  const isInvitationRoute = invitationToken !== null
  const hasEmailVerificationToken = new URLSearchParams(window.location.search).has('email_verification_token')
  const publicStoreSlug = hasEmailVerificationToken ? null : publicStoreSlugFromPath(window.location.pathname)
  const isRegister = mode === 'register'
  const isAdmin = Boolean(user && isPlatformAdmin(user))
  const ownerStore = myStores.find((store) => store.membership?.role === 'owner')
  const primaryMembershipRole = (ownerStore?.membership?.role ?? myStores.find((store) => store.membership?.role === 'admin')?.membership?.role ?? myStores[0]?.membership?.role ?? null) as StoreRole | null
  const selectedMembership = selectedStoreId === null ? null : myStores.find((store) => store.id === selectedStoreId)?.membership?.role ?? null
  const dashboardMembershipRole = (selectedStoreId === null ? primaryMembershipRole : selectedMembership) as StoreRole | null
  const turnstileSiteKey = (import.meta.env as Record<string, string | undefined>).VITE_TURNSTILE_SITE_KEY ?? ''

  const handleStoreUpdated = useCallback((updatedStore: StoreProfile) => {
    setMyStores((stores) => stores.map((store) => store.id === updatedStore.id
      ? { ...updatedStore, membership: store.membership }
      : store))
    setSelectedPlatformStore((store) => store?.id === updatedStore.id ? updatedStore : store)
  }, [])

  const refreshImageAccessToken = useCallback<ImageTokenRefresh>(async (expiredToken) => {
    const currentSession = loadAuthSession()
    if (!currentSession || currentSession.user.id !== user?.id) throw new Error(i18n.t('errors.sessionExpired', { ns: 'common' }))
    if (currentSession.access_token !== expiredToken) {
      setAccessToken(currentSession.access_token)
      return currentSession.access_token
    }
    if (imageRefreshPromise.current) return imageRefreshPromise.current

    const refreshRequest = refreshAuth(currentSession.refresh_token).then(({ access_token: refreshedToken }) => {
      const nextSession = { ...currentSession, access_token: refreshedToken }
      saveAuthSession(nextSession)
      setAccessToken(refreshedToken)
      return refreshedToken
    }).finally(() => { imageRefreshPromise.current = null })
    imageRefreshPromise.current = refreshRequest
    return refreshRequest
  }, [user?.id])

  useEffect(() => {
    clearProductImageCache()
  }, [user?.id])

  async function completeAuth(auth: { user: User; access_token: string; refresh_token: string }) {
    setPendingVerificationEmail(null)
    setPendingNotice(null)
    setUser(auth.user)
    setAccessToken(auth.access_token)
    setMyStores([])
    setSelectedStoreId(null)
    setSelectedPlatformStore(null)
    setMemberStoresResolved(false)
    setMemberStoresError(null)
    setDashboardContext(isPlatformAdmin(auth.user) ? 'platform' : 'customer')
    saveAuthSession(auth)
    setActiveSection('dashboard')
  }

  useEffect(() => {
    if (!user) return undefined

    window.history.pushState({ appShell: 'dashboard' }, '', window.location.href)

    function handlePopState() {
      window.history.pushState({ appShell: 'dashboard' }, '', window.location.href)
      setActiveSection('dashboard')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [user])

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (publicStoreSlug) {
        if (!cancelled) setBootstrapping(false)
        return
      }

      const verificationToken = new URLSearchParams(window.location.search).get('email_verification_token')

      if (verificationToken) {
        try {
          const auth = await verifyEmail(verificationToken)
          if (cancelled) return
          await completeAuth(auth)
          if (!readInvitationToken(window.location.pathname)) setInvitationContextMissing(true)
          setSuccess(t('verified', { ns: 'auth' }))
        } catch (verificationError) {
          if (!cancelled) setError(verificationError instanceof Error ? verificationError.message : t('verifyError', { ns: 'auth' }))
        } finally {
          if (!cancelled) {
            window.history.replaceState({}, '', window.location.pathname)
            setBootstrapping(false)
          }
        }
        return
      }

      const session = loadAuthSession()
      if (!session) {
        if (!cancelled) setBootstrapping(false)
        return
      }

      try {
        const refreshed = await refreshAuth(session.refresh_token)
        if (cancelled) return
        await completeAuth({ user: session.user, access_token: refreshed.access_token, refresh_token: session.refresh_token })
      } catch {
        clearAuthSession()
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    void restoreSession()
    return () => { cancelled = true }
  }, [publicStoreSlug, t])

  useEffect(() => {
    if (publicStoreSlug) return undefined

    async function handleStorage(event: StorageEvent) {
      if (event.key !== authSessionKey) return
      if (!event.newValue) {
        setUser(null)
        setAccessToken(null)
        setMyStores([])
        setSelectedStoreId(null)
        setSelectedPlatformStore(null)
        setMemberStoresResolved(false)
        setPendingVerificationEmail(null)
        setPendingNotice(null)
        setActiveSection('dashboard')
        return
      }
      try {
        await completeAuth(JSON.parse(event.newValue) as { user: User; access_token: string; refresh_token: string })
      } catch {
        clearAuthSession()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [publicStoreSlug])

  useEffect(() => {
    if (!accessToken || isInvitationRoute) return undefined
    let cancelled = false
    void fetchMyStores(accessToken).then(({ stores }) => {
      if (!cancelled) {
        setMemberStoresError(null)
        setMyStores(stores)
        setMemberStoresResolved(true)
        const role = stores.some((store) => store.membership?.role === 'owner')
          ? 'store'
          : stores.some((store) => store.membership?.role === 'admin')
            ? 'store'
            : stores.length > 0
              ? 'employee'
              : 'customer'
        setDashboardContext(isPlatformAdmin(user!) ? 'platform' : role)
      }
    }).catch((requestError: unknown) => {
      if (!cancelled) {
        setMyStores([])
        setMemberStoresResolved(true)
        setMemberStoresError(requestError instanceof Error ? requestError.message : t('overview.loadError', { ns: 'dashboard' }))
        if (!isPlatformAdmin(user!)) setDashboardContext('customer')
      }
    })
    return () => { cancelled = true }
  }, [accessToken, isInvitationRoute, memberStoresAttempt, t, user])

  async function handleAuth(event: FormEvent<HTMLFormElement>, profile?: RegistrationProfile) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (isRegister) {
        const response = await register(email, password, turnstileSiteKey ? turnstileToken : null, profile)
        setPassword('')
        setTurnstileToken(null)
        setRegistrationProfile({ first_name: '', last_name: '', phone_number: '' })
        setPendingVerificationEmail(email.trim().toLowerCase())
        setPendingNotice(response.message)
      } else {
        const auth = await login(email, password)
        if ('access_token' in auth) {
          await completeAuth(auth)
          setSuccess(t('signedIn', { ns: 'auth' }))
        } else {
          clearAuthSession()
          setUser(null)
          setAccessToken(null)
          setMyStores([])
          setMemberStoresResolved(false)
          setPendingVerificationEmail(auth.user.email)
          setPendingNotice(null)
          setPassword('')
        }
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : t('authError', { ns: 'auth' }))
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerificationEmail() {
    if (!pendingVerificationEmail) return
    setError(null)
    setSuccess(null)
    setPendingNotice(null)
    setResendLoading(true)
    try {
      await resendVerificationEmail(pendingVerificationEmail)
      setPendingNotice(t('verificationSent', { ns: 'auth' }))
    } catch (resendError) {
      setPendingNotice(resendError instanceof Error ? resendError.message : t('resendError', { ns: 'auth' }))
      setError(resendError instanceof Error ? resendError.message : t('resendError', { ns: 'auth' }))
    } finally {
      setResendLoading(false)
    }
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode)
    setTurnstileToken(null)
    setError(null)
    setSuccess(null)
  }

  function handleLogout() {
    setUser(null)
    setAccessToken(null)
    setMyStores([])
    setSelectedStoreId(null)
    setSelectedPlatformStore(null)
    setMemberStoresResolved(false)
    setMemberStoresError(null)
    setDashboardContext('customer')
    setPendingVerificationEmail(null)
    setPendingNotice(null)
    setEmail('')
    setPassword('')
    setTurnstileToken(null)
    setMode('login')
    setActiveSection('dashboard')
    setError(null)
    setSuccess(null)
    clearAuthSession()
  }

  if (publicStoreSlug) return <Suspense fallback={<ScreenLoading />}><PublicStorefrontRoute slug={publicStoreSlug} /></Suspense>

  if (bootstrapping) {
    if (isInvitationRoute) {
      return <Box sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}><Typography color="text.secondary">{t('actions.loading')}</Typography></Box>
    }
    return <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}><Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}><Stack spacing={3} sx={{ alignItems: 'center' }}><LandingPage /></Stack></Container></Box>
  }

  if (pendingVerificationEmail) {
    return <PendingVerificationPanel loading={resendLoading} notice={pendingNotice} onResend={handleResendVerificationEmail} contextMessage={isInvitationRoute ? t('verificationContinue', { ns: 'onboarding' }) : null} />
  }

  if (isInvitationRoute && !user) {
    return <Suspense fallback={<ScreenLoading />}><><StoreOnboarding token={invitationToken} user={null} accessToken={null} /><Container maxWidth="sm" sx={{ pb: 4 }}><AuthCard mode={mode} email={email} password={password} loading={loading} error={error} success={success} turnstileSiteKey={turnstileSiteKey || null} turnstileToken={turnstileToken} onEmailChange={setEmail} onPasswordChange={setPassword} onModeChange={handleModeChange} onTurnstileTokenChange={setTurnstileToken} onSubmit={handleAuth} heading={mode === 'register' ? t('invitationRegisterHeading', { ns: 'auth' }) : t('invitationLoginHeading', { ns: 'auth' })} description={t('invitationDescription', { ns: 'auth' })} /></Container></></Suspense>
  }

  if (isInvitationRoute && user) return <Suspense fallback={<ScreenLoading />}><StoreOnboarding token={invitationToken} user={user} accessToken={accessToken} /></Suspense>

  if (!user) {
    return <Suspense fallback={<ScreenLoading />}><Box sx={{ minHeight: '100svh', bgcolor: 'background.default', py: { xs: 3, md: 5 } }}><Container maxWidth="lg"><Stack spacing={{ xs: 3, md: 4 }} sx={{ alignItems: 'center' }}><LandingPage /><AuthCard mode={mode} email={email} password={password} loading={loading} error={error} success={success} turnstileSiteKey={turnstileSiteKey || null} turnstileToken={turnstileToken} onEmailChange={setEmail} onPasswordChange={setPassword} onModeChange={handleModeChange} onTurnstileTokenChange={setTurnstileToken} onSubmit={handleAuth} customerExperience registrationProfile={registrationProfile} onRegistrationProfileChange={setRegistrationProfile} /></Stack></Container></Box></Suspense>
  }

  if (!isAdmin && !memberStoresResolved) {
    return <Box sx={{ minHeight: '100svh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 2, bgcolor: 'background.default' }}><CircularProgress aria-label={t('overview.loadingAccess', { ns: 'dashboard' })} /><Typography color="text.secondary">{t('overview.loadingAccess', { ns: 'dashboard' })}</Typography></Box>
  }

  function renderDashboard() {
    if (activeSection === 'invitations') {
      if (dashboardContext !== 'platform' || !isAdmin || !accessToken) return <Alert severity="error">{t('overview.accessDeniedInvitations', { ns: 'dashboard' })}</Alert>
      return <StoreInvitations accessToken={accessToken} />
    }
    if (activeSection === 'products') {
      if (!accessToken) return null
      if (dashboardContext === 'platform' && isAdmin && selectedStoreId !== null) {
        if (!memberStoresResolved) return <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={24} aria-label={t('overview.loadingPermissions', { ns: 'dashboard' })} /><Typography color="text.secondary">{t('overview.loadingPermissions', { ns: 'dashboard' })}</Typography></Stack>
        return <StoreCatalogManagement
          accessToken={accessToken}
          stores={myStores}
          scope="platform"
          platformStoreId={selectedStoreId}
          platformStore={selectedPlatformStore}
          userId={user?.id}
          refreshAccessToken={refreshImageAccessToken}
          onBack={() => setActiveSection('dashboard')}
        />
      }
      if (dashboardContext === 'store' && (dashboardMembershipRole === 'owner' || dashboardMembershipRole === 'admin')) {
        return <StoreCatalogManagement accessToken={accessToken} stores={myStores} scope="member" initialStoreId={selectedStoreId ?? ownerStore?.id ?? null} userId={user?.id} refreshAccessToken={refreshImageAccessToken} />
      }
      return <Alert severity="error">{t('overview.accessDeniedProducts', { ns: 'dashboard' })}</Alert>
    }
    if (activeSection !== 'dashboard') return <Alert severity="info">{t('overview.comingSoon', { ns: 'dashboard' })}</Alert>
    if (!accessToken) return null

    if (dashboardContext === 'platform') {
      if (selectedStoreId !== null) {
        if (!memberStoresResolved) return <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={24} aria-label={t('overview.loadingPermissions', { ns: 'dashboard' })} /><Typography color="text.secondary">{t('overview.loadingPermissions', { ns: 'dashboard' })}</Typography></Stack>
        const hasManagerMembership = selectedMembership === 'owner' || selectedMembership === 'admin'
        return <StoreDetailsPanel
          key={`${user?.id ?? 'guest'}-${selectedStoreId}-platform`}
          storeId={selectedStoreId}
          accessToken={accessToken}
          source="platform"
          editable={hasManagerMembership}
          membershipRole={selectedMembership}
          cacheScope={`user-${user?.id ?? 'unknown'}`}
          refreshAccessToken={refreshImageAccessToken}
          onBack={() => { setSelectedStoreId(null); setSelectedPlatformStore(null) }}
          onStoreUpdated={handleStoreUpdated}
        />
      }
      return <Stack spacing={3}>
        <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 } }}><Typography variant="h4" component="h2" gutterBottom>{t('overview.platformDashboard', { ns: 'dashboard' })}</Typography><Typography color="text.secondary">{t('overview.platformDashboardDescription', { ns: 'dashboard' })}</Typography></CardContent></Card>
        <Box><Typography variant="h5" component="h2" sx={{ mb: 2 }}>{t('overview.allStores', { ns: 'dashboard' })}</Typography><StoreDirectory kind="platform" accessToken={accessToken} onSelectStore={(store) => { setSelectedStoreId(store.id); setSelectedPlatformStore(store) }} /></Box>
      </Stack>
    }

    if (dashboardContext === 'store' && ownerStore) {
      return <StoreDetailsPanel key={`${user?.id ?? 'guest'}-${ownerStore.id}-member`} storeId={ownerStore.id} accessToken={accessToken} source="member" editable cacheScope={`user-${user?.id ?? 'unknown'}`} refreshAccessToken={refreshImageAccessToken} onStoreUpdated={handleStoreUpdated} />
    }

    if (dashboardContext === 'store' || dashboardContext === 'employee') {
      return <Stack spacing={2.5}>
        <Typography color="text.secondary">{t('overview.membershipStores', { ns: 'dashboard' })}</Typography>
        {dashboardContext === 'store' && primaryMembershipRole === 'admin' ? (
          selectedStoreId === null
            ? <StoreDirectory kind="member" accessToken={accessToken} onSelectStore={(store) => setSelectedStoreId(store.id)} />
            : <StoreDetailsPanel key={`${user?.id ?? 'guest'}-${selectedStoreId}-member`} storeId={selectedStoreId} accessToken={accessToken} source="member" editable cacheScope={`user-${user?.id ?? 'unknown'}`} refreshAccessToken={refreshImageAccessToken} onBack={() => setSelectedStoreId(null)} backLabel={t('overview.backToMyStores', { ns: 'dashboard' })} onStoreUpdated={handleStoreUpdated} />
        ) : <StoreDirectory kind="member" accessToken={accessToken} />}
      </Stack>
    }

    return <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 } }}><Stack spacing={1.5}><Typography variant="h4" component="h2">{t('overview.welcome', { ns: 'dashboard' })}</Typography><Typography color="text.secondary">{t('overview.customerPlaceholder', { ns: 'dashboard' })}</Typography></Stack></CardContent></Card>
  }

  return <Suspense fallback={<ScreenLoading />}><DashboardLayout email={user.email} role={user.role} context={dashboardContext} storeRole={dashboardMembershipRole} canSwitchContext={isAdmin && myStores.length > 0} isPlatformAdmin={isAdmin} showPlatformCatalog={dashboardContext === 'platform' && selectedStoreId !== null} activeSection={activeSection} onContextChange={(context) => { setDashboardContext(context); setSelectedStoreId(null); setSelectedPlatformStore(null); setActiveSection('dashboard') }} onNavigate={(section) => { setError(null); setSuccess(null); setActiveSection(section) }} onLogout={handleLogout}>
    <Stack spacing={3}>
      {invitationContextMissing && <Alert severity="info">{t('overview.invitationContextMissing', { ns: 'dashboard' })}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {memberStoresError && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => { setMemberStoresResolved(false); setMemberStoresAttempt((attempt) => attempt + 1) }}>{t('overview.retry', { ns: 'dashboard' })}</Button>}>{t('overview.membershipError', { ns: 'dashboard', error: memberStoresError })}</Alert>}
      <Suspense fallback={<SectionLoading />}>{renderDashboard()}</Suspense>
    </Stack>
  </DashboardLayout>
  </Suspense>
}

function readInvitationToken(pathname: string) {
  const match = pathname.match(/^\/invite\/([^/]+)\/?$/)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

export default App
