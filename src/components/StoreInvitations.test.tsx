import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreInvitations } from './StoreInvitations'
import { createStoreInvitation, fetchStoreInvitations, revokeStoreInvitation } from '../api/storeInvitations'

vi.mock('../api/storeInvitations', () => ({
  fetchStoreInvitations: vi.fn(),
  createStoreInvitation: vi.fn(),
  revokeStoreInvitation: vi.fn(),
}))

const pendingInvitation = {
  id: 8,
  recipient_email: null,
  expires_at: '2026-10-20T12:00:00Z',
  status: 'pending' as const,
  created_by_id: 2,
  redeemed_by_id: null,
  redeemed_at: null,
  revoked_at: null,
  created_at: '2026-10-13T12:00:00Z',
}

describe('StoreInvitations', () => {
  beforeEach(() => {
    vi.mocked(fetchStoreInvitations).mockReset()
    vi.mocked(createStoreInvitation).mockReset()
    vi.mocked(revokeStoreInvitation).mockReset()
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [] })
  })

  it('shows loading, empty, and retryable API error states', async () => {
    let resolveRequest: ((value: { invitations: [] }) => void) | undefined
    vi.mocked(fetchStoreInvitations).mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve }))
    const { rerender } = render(<StoreInvitations accessToken="jwt" />)
    expect(screen.getByRole('progressbar', { name: 'Loading invitations' })).toBeInTheDocument()
    resolveRequest?.({ invitations: [] })
    expect(await screen.findByText('No invitations yet')).toBeInTheDocument()

    vi.mocked(fetchStoreInvitations).mockRejectedValueOnce(new Error('Not allowed'))
    rerender(<StoreInvitations accessToken="new-jwt" />)
    await waitFor(() => expect(screen.getByText(/Could not load invitations: Not allowed/)).toBeInTheDocument())
    vi.mocked(fetchStoreInvitations).mockResolvedValueOnce({ invitations: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No invitations yet')).toBeInTheDocument()
  })

  it('lists invitation fields and only offers revoke for active invitations', async () => {
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [pendingInvitation, { ...pendingInvitation, id: 9, status: 'redeemed' }] })
    render(<StoreInvitations accessToken="jwt" />)
    expect(await screen.findAllByText('Open invitation')).toHaveLength(2)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Redeemed')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /revoke invitation/i })).toHaveLength(1)
  })

  it('creates an open invitation and shows its token link only until dialog dismissal', async () => {
    const user = userEvent.setup()
    vi.mocked(createStoreInvitation).mockResolvedValue({ invitation: pendingInvitation, token: 'one-time-token' })
    render(<StoreInvitations accessToken="jwt" />)
    await user.click(await screen.findByRole('button', { name: 'New Invitation' }))
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(createStoreInvitation).toHaveBeenCalledWith('jwt', undefined)
    const link = await screen.findByLabelText('Invitation link')
    expect(link).toHaveValue(`${window.location.origin}/invite/one-time-token`)
    expect(screen.getByText(/expires in seven days/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByDisplayValue(/one-time-token/)).not.toBeInTheDocument()
    expect(window.localStorage.length).toBe(0)
  })

  it('validates email and supports recipient-restricted invitation creation', async () => {
    const user = userEvent.setup()
    vi.mocked(createStoreInvitation).mockResolvedValue({ invitation: { ...pendingInvitation, recipient_email: 'buyer@example.com' }, token: 'secret' })
    render(<StoreInvitations accessToken="jwt" />)
    await user.click(await screen.findByRole('button', { name: 'New Invitation' }))
    await user.type(screen.getByLabelText('Recipient email (optional)'), 'wrong-email')
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(await screen.findByText(/Enter a valid email address/)).toBeInTheDocument()
    expect(createStoreInvitation).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Recipient email (optional)'))
    await user.type(screen.getByLabelText('Recipient email (optional)'), 'buyer@example.com')
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    await screen.findByLabelText('Invitation link')
    expect(createStoreInvitation).toHaveBeenCalledWith('jwt', 'buyer@example.com')
  })

  it('copies the generated link and reports clipboard errors', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    vi.mocked(createStoreInvitation).mockResolvedValue({ invitation: pendingInvitation, token: 'copy-token' })
    render(<StoreInvitations accessToken="jwt" />)
    await user.click(await screen.findByRole('button', { name: 'New Invitation' }))
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    await user.click(await screen.findByRole('button', { name: 'Copy Link' }))
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/invite/copy-token`)
    expect(await screen.findByText('Invitation link copied.')).toBeInTheDocument()
  })

  it('requires revoke confirmation and refreshes only after server success', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [pendingInvitation] })
    vi.mocked(revokeStoreInvitation).mockResolvedValue(undefined)
    render(<StoreInvitations accessToken="jwt" />)
    await user.click(await screen.findByRole('button', { name: /revoke invitation for open invitation/i }))
    expect(screen.getByRole('heading', { name: 'Revoke invitation?' })).toBeInTheDocument()
    expect(revokeStoreInvitation).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Revoke invitation' }))
    await waitFor(() => expect(revokeStoreInvitation).toHaveBeenCalledWith('jwt', 8))
    expect(await screen.findByText('Invitation revoked.')).toBeInTheDocument()
    expect(fetchStoreInvitations).toHaveBeenCalledTimes(2)
  })

  it('keeps the dialog and link on create failure and surfaces revoke failures', async () => {
    const user = userEvent.setup()
    vi.mocked(createStoreInvitation).mockRejectedValueOnce(new Error('Invalid recipient email'))
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [pendingInvitation] })
    vi.mocked(revokeStoreInvitation).mockRejectedValueOnce(new Error('Not allowed'))
    render(<StoreInvitations accessToken="jwt" />)
    await user.click(await screen.findByRole('button', { name: 'New Invitation' }))
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(await screen.findByText('Invalid recipient email')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(await screen.findByRole('button', { name: /revoke invitation for open invitation/i }))
    await user.click(screen.getByRole('button', { name: 'Revoke invitation' }))
    expect(await screen.findByText('Not allowed')).toBeInTheDocument()
  })

  it('renders invitation cards at mobile widths', async () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({ matches: query.includes('max-width'), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [pendingInvitation] })
    const { container } = render(<StoreInvitations accessToken="jwt" />)
    await screen.findByText('Open invitation')
    expect(container.querySelector('table')).not.toBeInTheDocument()
    expect(screen.getByText(/Created/)).toBeInTheDocument()
  })
})
