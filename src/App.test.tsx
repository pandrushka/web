import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AuthResponse } from './types/auth'

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  refreshAuth: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
}))

const onboardingApi = vi.hoisted(() => ({
  fetchQuestions: vi.fn(),
  fetchAdminQuestions: vi.fn(),
  submitAnswers: vi.fn(),
  createAdminQuestion: vi.fn(),
  updateAdminQuestion: vi.fn(),
}))

const storeApi = vi.hoisted(() => ({
  fetchMyStores: vi.fn(),
  fetchAllStores: vi.fn(),
  fetchStore: vi.fn(),
  fetchAdminStore: vi.fn(),
  updateStore: vi.fn(),
  validateStoreInvitation: vi.fn(),
  createStoreFromInvitation: vi.fn(),
}))

vi.mock('./api/auth', () => authApi)
vi.mock('./api/onboarding', () => onboardingApi)
vi.mock('./api/stores', () => storeApi)

const userAuthResponse: AuthResponse = {
  user: {
    id: 1,
    email: 'andrey@example.com',
    role: 'member',
  },
  access_token: 'access-token-1',
  refresh_token: 'refresh-token-1',
}

beforeEach(() => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
  authApi.login.mockReset()
  authApi.register.mockReset()
  authApi.refreshAuth.mockReset()
  authApi.verifyEmail.mockReset()
  authApi.resendVerificationEmail.mockReset()
  onboardingApi.fetchQuestions.mockReset()
  onboardingApi.fetchAdminQuestions.mockReset()
  onboardingApi.submitAnswers.mockReset()
  onboardingApi.createAdminQuestion.mockReset()
  onboardingApi.updateAdminQuestion.mockReset()
  storeApi.fetchMyStores.mockReset().mockResolvedValue({ stores: [] })
  storeApi.fetchAllStores.mockReset().mockResolvedValue({ stores: [], pagination: { page: 1, per_page: 25, total_count: 0, total_pages: 0 } })
  storeApi.fetchStore.mockReset().mockResolvedValue({ store: { id: 9, name: 'Nica Market', slug: 'nica-market', description: null, logo_initial: 'N', phone_number: null, city: 'Masaya', address: null, directions: null, status: 'draft', membership: { role: 'owner' } } })
  storeApi.fetchAdminStore.mockReset().mockResolvedValue({ store: { id: 1, name: 'Draft Market', slug: 'draft-market', description: null, logo_initial: 'D', phone_number: null, city: 'León', address: null, directions: null, status: 'draft' } })
  storeApi.updateStore.mockReset()
  storeApi.validateStoreInvitation.mockReset().mockResolvedValue({ valid: true, expires_at: '2026-10-19T10:00:00Z' })
  storeApi.createStoreFromInvitation.mockReset()
  window.history.replaceState({}, '', '/')
})

describe('App auth shell', () => {
  it('logs in, stores the session, and shows the neutral customer dashboard', async () => {
    authApi.login.mockResolvedValue(userAuthResponse)

    const user = userEvent.setup()

    render(<App />)

    await screen.findByLabelText(/email/i)
    await user.type(screen.getByLabelText(/email/i), 'andrey@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => expect(screen.getByText(/welcome to store platform/i)).toBeInTheDocument())
    expect(screen.getByText(/store browsing and ordering/i)).toBeInTheDocument()
    expect(authApi.login).toHaveBeenCalledWith('andrey@example.com', 'password123')
    expect(onboardingApi.fetchQuestions).not.toHaveBeenCalled()
    expect(storeApi.fetchMyStores).toHaveBeenCalledWith('access-token-1')
    expect(JSON.parse(window.localStorage.getItem('forme.auth.session') ?? 'null')).toMatchObject({
      user: userAuthResponse.user,
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
    })
  })

  it('shows the pending verification page after login for an unverified user', async () => {
    authApi.login.mockResolvedValue({
      user: {
        id: 1,
        email: 'andrey@example.com',
        role: 'member',
        email_verified_at: null,
      },
      status: 'pending_verification',
      message: 'Need to validate email',
    })
    authApi.resendVerificationEmail.mockResolvedValue({ message: 'If the account exists, the verification email has been sent.' })

    const user = userEvent.setup()

    render(<App />)

    await screen.findByLabelText(/email/i)
    await user.type(screen.getByLabelText(/email/i), 'andrey@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await screen.findByText(/need to validate email/i)
    await user.click(screen.getByRole('button', { name: /resend email/i }))

    await waitFor(() => expect(authApi.resendVerificationEmail).toHaveBeenCalledWith('andrey@example.com'))
    expect(window.localStorage.getItem('forme.auth.session')).toBeNull()
  })

  it('moves a pending tab to the dashboard when another tab verifies the account', async () => {
    authApi.login.mockResolvedValue({
      user: {
        id: 1,
        email: 'andrey@example.com',
        role: 'member',
        email_verified_at: null,
      },
      status: 'pending_verification',
      message: 'Need to validate email',
    })

    const user = userEvent.setup()

    render(<App />)

    await screen.findByLabelText(/email/i)
    await user.type(screen.getByLabelText(/email/i), 'andrey@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await screen.findByText(/need to validate email/i)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'forme.auth.session',
        newValue: JSON.stringify(userAuthResponse),
      }),
    )

    await waitFor(() => expect(screen.getByText(/welcome to store platform/i)).toBeInTheDocument())
    expect(onboardingApi.fetchQuestions).not.toHaveBeenCalled()
  })

  it('shows a pending verification message after registration', async () => {
    authApi.register.mockResolvedValue({ message: 'Check your email to verify your account.' })

    const user = userEvent.setup()

    render(<App />)

    await screen.findByLabelText(/email/i)
    await user.click(screen.getByRole('button', { name: /need an account\? create one/i }))
    await user.type(screen.getByLabelText(/email/i), 'andrey@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await screen.findByText(/need to validate email/i)
    expect(window.localStorage.getItem('forme.auth.session')).toBeNull()
  })

  it('restores a saved session and redirects straight to the dashboard', async () => {
    window.localStorage.setItem('forme.auth.session', JSON.stringify(userAuthResponse))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'refreshed-access-token' })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/welcome to store platform/i)).toBeInTheDocument())
    expect(authApi.refreshAuth).toHaveBeenCalledWith('refresh-token-1')
    expect(onboardingApi.fetchQuestions).not.toHaveBeenCalled()
  })

  it('verifies an account from the email link and signs the user in', async () => {
    authApi.verifyEmail.mockResolvedValue(userAuthResponse)
    window.history.replaceState({}, '', '/?email_verification_token=verify-token-1')

    render(<App />)

    await waitFor(() => expect(screen.getByText(/welcome to store platform/i)).toBeInTheDocument())
    expect(authApi.verifyEmail).toHaveBeenCalledWith('verify-token-1')
    expect(onboardingApi.fetchQuestions).not.toHaveBeenCalled()
  })

  it('continues an invitation through login without changing its URL', async () => {
    window.history.replaceState({}, '', '/invite/invitation-token-1')
    authApi.login.mockResolvedValue({ ...userAuthResponse, user: { ...userAuthResponse.user, email_verified_at: '2026-10-12T10:00:00Z' } })
    const user = userEvent.setup()

    render(<App />)
    await user.type(await screen.findByLabelText(/email/i), 'andrey@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByRole('heading', { name: 'Store identity' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/invite/invitation-token-1')
    expect(storeApi.validateStoreInvitation).toHaveBeenCalledWith('invitation-token-1', 'access-token-1')
    expect(onboardingApi.fetchQuestions).not.toHaveBeenCalled()
  })

  it('keeps the invitation URL while registration waits for email verification', async () => {
    window.history.replaceState({}, '', '/invite/invitation-token-2')
    authApi.register.mockResolvedValue({ message: 'Check your email to verify your account.' })
    const user = userEvent.setup()

    render(<App />)
    await user.click(await screen.findByRole('button', { name: /need an account\? create one/i }))
    await user.type(screen.getByLabelText(/email/i), 'andrey@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/after verifying, return to this invitation page/i)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/invite/invitation-token-2')
    expect(window.localStorage.getItem('forme.auth.session')).toBeNull()
  })

  it('continues the invitation in the original tab after cross-tab verification', async () => {
    window.history.replaceState({}, '', '/invite/invitation-token-3')
    render(<App />)
    await screen.findByLabelText(/email/i)
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: 'forme.auth.session',
      newValue: JSON.stringify({ ...userAuthResponse, user: { ...userAuthResponse.user, email_verified_at: '2026-10-12T10:00:00Z' } }),
    })))

    expect(await screen.findByRole('heading', { name: 'Store identity' })).toBeInTheDocument()
    await waitFor(() => expect(storeApi.validateStoreInvitation).toHaveBeenCalledWith('invitation-token-3', 'access-token-1'))
  })

  it('guides users to reopen the invitation after same-tab email verification loses its context', async () => {
    authApi.verifyEmail.mockResolvedValue(userAuthResponse)
    window.history.replaceState({}, '', '/?email_verification_token=verify-token-2')

    render(<App />)

    expect(await screen.findByText(/reopen the original invitation link/i)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
    expect(window.location.search).toBe('')
  })

  it('defaults platform-only users to all stores, including draft and suspended stores', async () => {
    const platformUser = { ...userAuthResponse, user: { ...userAuthResponse.user, role: 'platform_admin' } }
    const platformStores = [
      { id: 1, name: 'Draft Market', slug: 'draft-market', description: null, logo_initial: 'D', phone_number: null, city: 'León', address: null, directions: null, status: 'draft' },
      { id: 2, name: 'Paused Market', slug: 'paused-market', description: null, logo_initial: 'P', phone_number: null, city: 'Managua', address: null, directions: null, status: 'suspended' },
    ]
    window.localStorage.setItem('forme.auth.session', JSON.stringify(platformUser))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'platform-token' })
    storeApi.fetchMyStores.mockResolvedValue({ stores: [] })
    storeApi.fetchAllStores.mockResolvedValue({ stores: platformStores, pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 } })

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Platform dashboard' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Draft Market' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Paused Market' })).toBeInTheDocument()
    expect(storeApi.fetchAllStores).toHaveBeenCalledWith('platform-token', 1)
    expect(screen.queryByRole('combobox', { name: /context/i })).not.toBeInTheDocument()
  })

  it('opens the owner store details directly with editable information', async () => {
    const ownedStore = { id: 9, name: 'Nica Market', slug: 'nica-market', description: null, logo_initial: 'N', phone_number: null, city: 'Masaya', address: null, directions: null, status: 'draft', membership: { role: 'owner' } }
    window.localStorage.setItem('forme.auth.session', JSON.stringify(userAuthResponse))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'owner-token' })
    storeApi.fetchMyStores.mockResolvedValue({ stores: [ownedStore] })

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Store details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nica Market' })).toBeInTheDocument()
    expect(screen.getByText('Masaya')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit store details/i })).toBeInTheDocument()
    expect(storeApi.fetchStore).toHaveBeenCalledWith('owner-token', 9)
    expect(screen.queryByText(/no store access/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create.*store/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open navigation/i })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /open navigation/i }))
    expect(screen.getByRole('button', { name: /store owner dashboard/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('combobox', { name: /context/i })).not.toBeInTheDocument()
  })

  it('lets a platform admin who owns a store switch between platform and store data', async () => {
    const dualUser = { ...userAuthResponse, user: { ...userAuthResponse.user, role: 'platform_admin' } }
    const ownedStore = { id: 9, name: 'My Nica Market', slug: 'my-nica-market', description: null, logo_initial: 'M', phone_number: null, city: 'Masaya', address: null, directions: null, status: 'active', membership: { role: 'owner' } }
    const unrelatedStore = { id: 10, name: 'Another Store', slug: 'another-store', description: null, logo_initial: 'A', phone_number: null, city: 'León', address: null, directions: null, status: 'suspended' }
    window.localStorage.setItem('forme.auth.session', JSON.stringify(dualUser))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'dual-token' })
    storeApi.fetchMyStores.mockResolvedValue({ stores: [ownedStore] })
    storeApi.fetchAllStores.mockResolvedValue({ stores: [unrelatedStore], pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 } })
    storeApi.fetchStore.mockResolvedValue({ store: ownedStore })

    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Platform dashboard' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Another Store' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open navigation/i }))
    await user.click(screen.getByRole('combobox', { name: /context/i }))
    await user.click(await screen.findByRole('option', { name: 'Store Owner' }))

    expect(await screen.findByRole('heading', { name: 'My Nica Market' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Another Store' })).not.toBeInTheDocument()
    expect(storeApi.fetchMyStores).toHaveBeenCalledWith('dual-token')
  })

  it('gives employees member-scoped store access without owner management navigation', async () => {
    const employeeStore = { id: 12, name: 'Workplace Store', slug: 'workplace-store', description: null, logo_initial: 'W', phone_number: null, city: 'Chinandega', address: null, directions: null, status: 'active', membership: { role: 'employee' } }
    window.localStorage.setItem('forme.auth.session', JSON.stringify(userAuthResponse))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'employee-token' })
    storeApi.fetchMyStores.mockResolvedValue({ stores: [employeeStore] })

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Employee dashboard' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Workplace Store' })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /open account menu/i }))
    expect(screen.getAllByText('Employee')).toHaveLength(2)
    await user.keyboard('{Escape}')
    await user.click(await screen.findByRole('button', { name: /open navigation/i }))
    expect(screen.queryByRole('button', { name: /products/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /store settings/i })).not.toBeInTheDocument()
  })

  it('lets platform admins open any store read-only and return to all stores', async () => {
    const platformUser = { ...userAuthResponse, user: { ...userAuthResponse.user, role: 'platform_admin' } }
    const platformStore = { id: 1, name: 'Draft Market', slug: 'draft-market', description: null, logo_initial: 'D', phone_number: null, city: 'León', address: null, directions: null, status: 'draft' }
    window.localStorage.setItem('forme.auth.session', JSON.stringify(platformUser))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'platform-token' })
    storeApi.fetchMyStores.mockResolvedValue({ stores: [] })
    storeApi.fetchAllStores.mockResolvedValue({ stores: [platformStore], pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 } })
    storeApi.fetchAdminStore.mockResolvedValue({ store: platformStore })

    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'View Draft Market details' }))

    expect(await screen.findByRole('heading', { name: 'Draft Market' })).toBeInTheDocument()
    expect(storeApi.fetchAdminStore).toHaveBeenCalledWith('platform-token', 1)
    expect(screen.queryByRole('button', { name: /edit store details/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to All Stores' }))
    expect(await screen.findByRole('button', { name: 'View Draft Market details' })).toBeInTheDocument()
  })

  it('keeps a dual-role user editable only for an actual store membership', async () => {
    const dualUser = { ...userAuthResponse, user: { ...userAuthResponse.user, role: 'platform_admin' } }
    const ownStore = { id: 9, name: 'My Store', slug: 'my-store', description: null, logo_initial: 'M', phone_number: null, city: 'Masaya', address: null, directions: null, status: 'draft', membership: { role: 'owner' } }
    const otherStore = { id: 10, name: 'Other Store', slug: 'other-store', description: null, logo_initial: 'O', phone_number: null, city: 'León', address: null, directions: null, status: 'draft' }
    window.localStorage.setItem('forme.auth.session', JSON.stringify(dualUser))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'dual-token' })
    storeApi.fetchMyStores.mockResolvedValue({ stores: [ownStore] })
    storeApi.fetchAllStores.mockResolvedValue({ stores: [ownStore, otherStore], pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 } })
    storeApi.fetchStore.mockResolvedValue({ store: ownStore })
    storeApi.fetchAdminStore.mockResolvedValue({ store: otherStore })

    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'View My Store details' }))
    expect(await screen.findByRole('button', { name: /edit store details/i })).toBeInTheDocument()
    expect(storeApi.fetchStore).toHaveBeenCalledWith('dual-token', 9)
    await user.click(screen.getByRole('button', { name: 'Back to All Stores' }))
    await user.click(screen.getByRole('button', { name: 'View Other Store details' }))
    expect(await screen.findByRole('heading', { name: 'Other Store' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit store details/i })).not.toBeInTheDocument()
    expect(storeApi.fetchAdminStore).toHaveBeenCalledWith('dual-token', 10)
  })
})
