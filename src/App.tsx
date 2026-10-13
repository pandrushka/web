import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from '@mui/material'
import { login, refreshAuth, register, resendVerificationEmail, verifyEmail } from './api/auth'
import { fetchMyStores } from './api/stores'
import type { StoreProfile } from './api/stores'
import { AuthCard } from './components/AuthCard'
import { DashboardLayout } from './components/DashboardLayout'
import type { DashboardContext, DashboardSection, StoreRole } from './components/DashboardLayout'
import { LandingPage } from './components/LandingPage'
import { PendingVerificationPanel } from './components/PendingVerificationPanel'
import { StoreDirectory } from './components/StoreDirectory'
import { StoreOnboarding } from './components/StoreOnboarding'
import { StoreDetailsPanel } from './components/StoreDetailsPanel'
import { StoreInvitations } from './components/StoreInvitations'
import type { AuthMode, User } from './types/auth'
import { authSessionKey, clearAuthSession, loadAuthSession, saveAuthSession } from './utils/authSession'
import { isPlatformAdmin } from './utils/auth'
import { dashboardRoleLabel } from './utils/roleLabels'

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [activeSection, setActiveSection] = useState<DashboardSection>('dashboard')
  const [dashboardContext, setDashboardContext] = useState<DashboardContext>('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [myStores, setMyStores] = useState<StoreProfile[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
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
  const invitationToken = readInvitationToken(window.location.pathname)
  const isInvitationRoute = invitationToken !== null
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
  }, [])

  async function completeAuth(auth: { user: User; access_token: string; refresh_token: string }) {
    setPendingVerificationEmail(null)
    setPendingNotice(null)
    setUser(auth.user)
    setAccessToken(auth.access_token)
    setMyStores([])
    setSelectedStoreId(null)
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
      const verificationToken = new URLSearchParams(window.location.search).get('email_verification_token')

      if (verificationToken) {
        try {
          const auth = await verifyEmail(verificationToken)
          if (cancelled) return
          await completeAuth(auth)
          if (!readInvitationToken(window.location.pathname)) setInvitationContextMissing(true)
          setSuccess('Email verified. Your account is active.')
        } catch (verificationError) {
          if (!cancelled) setError(verificationError instanceof Error ? verificationError.message : 'Could not verify your email')
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
  }, [])

  useEffect(() => {
    async function handleStorage(event: StorageEvent) {
      if (event.key !== authSessionKey) return
      if (!event.newValue) {
        setUser(null)
        setAccessToken(null)
        setMyStores([])
        setSelectedStoreId(null)
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
  }, [])

  useEffect(() => {
    if (!accessToken || isInvitationRoute) {
      setMyStores([])
      setMemberStoresResolved(true)
      return
    }
    let cancelled = false
    setMemberStoresError(null)
    void fetchMyStores(accessToken).then(({ stores }) => {
      if (!cancelled) {
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
        setMemberStoresError(requestError instanceof Error ? requestError.message : 'Could not load store access.')
        if (!isPlatformAdmin(user!)) setDashboardContext('customer')
      }
    })
    return () => { cancelled = true }
  }, [accessToken, isInvitationRoute, memberStoresAttempt, user?.id, user?.role])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (isRegister) {
        const response = await register(email, password, turnstileSiteKey ? turnstileToken : null)
        setPassword('')
        setTurnstileToken(null)
        setPendingVerificationEmail(email.trim().toLowerCase())
        setPendingNotice(response.message)
      } else {
        const auth = await login(email, password)
        if ('access_token' in auth) {
          await completeAuth(auth)
          setSuccess('Signed in.')
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
      setError(authError instanceof Error ? authError.message : 'Could not authenticate')
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
      setPendingNotice('Verification email sent.')
    } catch (resendError) {
      setPendingNotice(resendError instanceof Error ? resendError.message : 'Could not resend verification email')
      setError(resendError instanceof Error ? resendError.message : 'Could not resend verification email')
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

  if (bootstrapping) {
    if (isInvitationRoute) {
      return <Box sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}><Typography color="text.secondary">Checking your account…</Typography></Box>
    }
    return <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}><Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}><Stack spacing={3} sx={{ alignItems: 'center' }}><LandingPage onStartJourney={() => handleModeChange('register')} onHaveAccount={() => handleModeChange('login')} /></Stack></Container></Box>
  }

  if (pendingVerificationEmail) {
    return <PendingVerificationPanel loading={resendLoading} notice={pendingNotice} onResend={handleResendVerificationEmail} contextMessage={isInvitationRoute ? 'After verifying, return to this invitation page to continue store setup.' : null} />
  }

  if (isInvitationRoute && !user) {
    return <><StoreOnboarding token={invitationToken} user={null} accessToken={null} /><Container maxWidth="sm" sx={{ pb: 4 }}><AuthCard mode={mode} email={email} password={password} loading={loading} error={error} success={success} turnstileSiteKey={turnstileSiteKey || null} turnstileToken={turnstileToken} onEmailChange={setEmail} onPasswordChange={setPassword} onModeChange={handleModeChange} onTurnstileTokenChange={setTurnstileToken} onSubmit={handleAuth} heading={mode === 'register' ? 'Create an account to continue' : 'Sign in to continue'} description="Your invitation link will stay available while you sign in or create an account." /></Container></>
  }

  if (isInvitationRoute && user) return <StoreOnboarding token={invitationToken} user={user} accessToken={accessToken} />

  if (!user) {
    return <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', py: { xs: 3, md: 5 } }}><Container maxWidth="lg"><Stack spacing={4} sx={{ alignItems: 'center' }}><LandingPage onStartJourney={() => handleModeChange('register')} onHaveAccount={() => handleModeChange('login')} /><AuthCard mode={mode} email={email} password={password} loading={loading} error={error} success={success} turnstileSiteKey={turnstileSiteKey || null} turnstileToken={turnstileToken} onEmailChange={setEmail} onPasswordChange={setPassword} onModeChange={handleModeChange} onTurnstileTokenChange={setTurnstileToken} onSubmit={handleAuth} /></Stack></Container></Box>
  }

  if (!isAdmin && !memberStoresResolved) {
    return <Box sx={{ minHeight: '100svh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 2, bgcolor: 'background.default' }}><CircularProgress aria-label="Loading store access" /><Typography color="text.secondary">Loading your store access…</Typography></Box>
  }

  function renderDashboard() {
    if (activeSection === 'invitations') {
      if (dashboardContext !== 'platform' || !isAdmin || !accessToken) return <Alert severity="error">You do not have access to invitations.</Alert>
      return <StoreInvitations accessToken={accessToken} />
    }
    if (activeSection !== 'dashboard') return <Alert severity="info">This section is coming soon.</Alert>
    if (!accessToken) return null

    if (dashboardContext === 'platform') {
      if (selectedStoreId !== null) {
        if (!memberStoresResolved) return <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={24} aria-label="Loading your store permissions" /><Typography color="text.secondary">Loading your store permissions…</Typography></Stack>
        const hasManagerMembership = selectedMembership === 'owner' || selectedMembership === 'admin'
        return <StoreDetailsPanel
          key={`${user?.id ?? 'guest'}-${selectedStoreId}-platform`}
          storeId={selectedStoreId}
          accessToken={accessToken}
          source={hasManagerMembership ? 'member' : 'platform'}
          editable={hasManagerMembership}
          onBack={() => setSelectedStoreId(null)}
          onStoreUpdated={handleStoreUpdated}
        />
      }
      return <Stack spacing={3}>
        <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 } }}><Typography variant="h4" component="h2" gutterBottom>Platform dashboard</Typography><Typography color="text.secondary">All stores across the platform, including draft and suspended stores.</Typography></CardContent></Card>
        <Box><Typography variant="h5" component="h2" sx={{ mb: 2 }}>All stores</Typography><StoreDirectory kind="platform" accessToken={accessToken} onSelectStore={(store) => setSelectedStoreId(store.id)} /></Box>
      </Stack>
    }

    if (dashboardContext === 'store' && ownerStore) {
      return <StoreDetailsPanel key={`${user?.id ?? 'guest'}-${ownerStore.id}-member`} storeId={ownerStore.id} accessToken={accessToken} source="member" editable onStoreUpdated={handleStoreUpdated} />
    }

    if (dashboardContext === 'store' || dashboardContext === 'employee') {
      return <Stack spacing={2.5}>
        <Box><Typography variant="h4" component="h2" gutterBottom>{dashboardRoleLabel(user?.role ?? 'member', dashboardContext, dashboardMembershipRole)} dashboard</Typography><Typography color="text.secondary">Stores available through your current memberships.</Typography></Box>
        {dashboardContext === 'store' && primaryMembershipRole === 'admin' ? (
          selectedStoreId === null
            ? <StoreDirectory kind="member" accessToken={accessToken} onSelectStore={(store) => setSelectedStoreId(store.id)} />
            : <StoreDetailsPanel key={`${user?.id ?? 'guest'}-${selectedStoreId}-member`} storeId={selectedStoreId} accessToken={accessToken} source="member" editable onBack={() => setSelectedStoreId(null)} backLabel="Back to My Stores" onStoreUpdated={handleStoreUpdated} />
        ) : <StoreDirectory kind="member" accessToken={accessToken} />}
      </Stack>
    }

    return <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 } }}><Stack spacing={1.5}><Typography variant="h4" component="h2">Welcome to Store Platform</Typography><Typography color="text.secondary">Store browsing and ordering will be available here in a future update.</Typography></Stack></CardContent></Card>
  }

  return <DashboardLayout email={user.email} role={user.role} context={dashboardContext} storeRole={dashboardMembershipRole} canSwitchContext={isAdmin && myStores.length > 0} isPlatformAdmin={isAdmin} activeSection={activeSection} onContextChange={(context) => { setDashboardContext(context); setSelectedStoreId(null); setActiveSection('dashboard') }} onNavigate={(section) => { setError(null); setSuccess(null); setActiveSection(section) }} onLogout={handleLogout}>
    <Stack spacing={3}>
      {invitationContextMissing && <Alert severity="info">Email verified. To continue store setup, reopen the original invitation link from the person who invited you.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {memberStoresError && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => { setMemberStoresResolved(false); setMemberStoresAttempt((attempt) => attempt + 1) }}>Retry</Button>}>Could not load your store membership: {memberStoresError}</Alert>}
      {renderDashboard()}
    </Stack>
  </DashboardLayout>
}

function readInvitationToken(pathname: string) {
  const match = pathname.match(/^\/invite\/([^/]+)\/?$/)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

export default App
