import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreOnboarding } from './StoreOnboarding'

const storeApi = vi.hoisted(() => ({
  validateStoreInvitation: vi.fn(),
  createStoreFromInvitation: vi.fn(),
}))

vi.mock('../api/stores', () => storeApi)

const verifiedUser = { id: 4, email: 'owner@example.com', role: 'member', email_verified_at: '2026-10-12T10:00:00Z' }
const invitationToken = 'private-invitation-token'

function renderOnboarding() {
  return render(
    <StoreOnboarding
      token={invitationToken}
      user={verifiedUser}
      accessToken="access-token"
      onLogin={vi.fn()}
      onRegister={vi.fn()}
    />,
  )
}

async function enterReview(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Store identity' })
  await user.type(screen.getByLabelText(/store name/i), 'Café Central')
  expect(screen.getByLabelText(/url slug/i)).toHaveValue('cafe-central')
  await user.type(screen.getByLabelText(/url slug/i), '-uno')
  await user.click(screen.getByRole('button', { name: /continue/i }))
  await user.type(screen.getByRole('textbox', { name: /city/i }), 'León')
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

beforeEach(() => {
  storeApi.validateStoreInvitation.mockReset().mockResolvedValue({ valid: true, expires_at: '2026-10-19T10:00:00Z' })
  storeApi.createStoreFromInvitation.mockReset()
})

describe('StoreOnboarding', () => {
  it('checks an authenticated invitation before showing the wizard', async () => {
    renderOnboarding()

    expect(await screen.findByRole('heading', { name: 'Store identity' })).toBeInTheDocument()
    expect(storeApi.validateStoreInvitation).toHaveBeenCalledWith(invitationToken, 'access-token')
  })

  it('rejects unavailable invitations and does not show the form', async () => {
    storeApi.validateStoreInvitation.mockRejectedValue(new Error('Invalid or unavailable invitation'))
    renderOnboarding()

    expect(await screen.findByText(/this invitation is invalid, expired, revoked, redeemed/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/store name/i)).not.toBeInTheDocument()
  })

  it('suggests a normalized editable slug and requires name, slug, and city', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await screen.findByLabelText(/store name/i)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(await screen.findByText(/store name and url slug are required/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/store name/i), 'Café Central')
    expect(screen.getByLabelText(/url slug/i)).toHaveValue('cafe-central')
    await user.clear(screen.getByLabelText(/url slug/i))
    await user.type(screen.getByLabelText(/url slug/i), 'mi-tienda')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(await screen.findByText('City is required.')).toBeInTheDocument()
  })

  it('persists one non-sensitive draft and requires an explicit restore choice', async () => {
    const user = userEvent.setup()
    const first = renderOnboarding()
    await user.type(await screen.findByLabelText(/store name/i), 'Pulpería La Esquina')
    await waitFor(() => expect(window.localStorage.getItem('storeOnboardingDraft')).toContain('Pulpería La Esquina'))
    expect(window.localStorage.getItem('storeOnboardingDraft')).not.toContain(invitationToken)
    expect(window.localStorage.getItem('storeOnboardingDraft')).not.toContain('phone_number')
    first.unmount()

    renderOnboarding()
    expect(await screen.findByText(/saved store details are available/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/store name/i)).toHaveValue('')
    await user.click(screen.getByRole('button', { name: /restore saved details/i }))
    expect(screen.getByLabelText(/store name/i)).toHaveValue('Pulpería La Esquina')
  })

  it('shows server slug errors and preserves entered values after API failure', async () => {
    const user = userEvent.setup()
    storeApi.createStoreFromInvitation.mockRejectedValue(new Error('Slug has already been taken'))
    renderOnboarding()
    await enterReview(user)
    await user.click(screen.getByRole('button', { name: /create store/i }))

    expect(await screen.findByText(/slug has already been taken/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(screen.getByLabelText(/store name/i)).toHaveValue('Café Central')
    expect(screen.getByLabelText(/url slug/i)).toHaveValue('cafe-central-uno')
    expect(window.localStorage.getItem('storeOnboardingDraft')).toContain('Café Central')
  })

  it('prevents duplicate submissions and confirms the returned draft store', async () => {
    const user = userEvent.setup()
    let finishRequest: ((value: unknown) => void) | undefined
    storeApi.createStoreFromInvitation.mockImplementation(() => new Promise((resolve) => { finishRequest = resolve }))
    renderOnboarding()
    await enterReview(user)
    const createButton = screen.getByRole('button', { name: /create store/i })
    await user.click(createButton)
    expect(createButton).toBeDisabled()
    expect(storeApi.createStoreFromInvitation).toHaveBeenCalledTimes(1)
    expect(storeApi.createStoreFromInvitation).toHaveBeenCalledWith(
      invitationToken,
      expect.objectContaining({ name: 'Café Central', slug: 'cafe-central-uno', city: 'León' }),
      'access-token',
    )

    finishRequest?.({ store: { id: 7, name: 'Café Central', slug: 'cafe-central-uno', status: 'draft' }, membership: { id: 8, role: 'owner' } })
    expect(await screen.findByText('Café Central')).toBeInTheDocument()
    expect(screen.getByText(/Your store is not publicly available yet/i)).toBeInTheDocument()
    expect(screen.getByText(/\/cafe-central-uno/)).toBeInTheDocument()
    expect(window.localStorage.getItem('storeOnboardingDraft')).toBeNull()
  })
})
