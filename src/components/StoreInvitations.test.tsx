import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreInvitations } from './StoreInvitations'
import { ApiRequestError } from '../api/client'
import { createStoreInvitation, fetchStoreInvitations, resendStoreInvitation, revokeStoreInvitation } from '../api/storeInvitations'

vi.mock('../api/storeInvitations', () => ({
  fetchStoreInvitations: vi.fn(),
  createStoreInvitation: vi.fn(),
  revokeStoreInvitation: vi.fn(),
  resendStoreInvitation: vi.fn(),
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
  last_resent_at: null,
  last_delivery_status: 'sent' as const,
  created_at: '2026-10-13T12:00:00Z',
}

describe('StoreInvitations', () => {
  beforeEach(() => {
    vi.mocked(fetchStoreInvitations).mockReset()
    vi.mocked(createStoreInvitation).mockReset()
    vi.mocked(revokeStoreInvitation).mockReset()
    vi.mocked(resendStoreInvitation).mockReset()
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
    vi.mocked(createStoreInvitation).mockResolvedValue({ invitation: pendingInvitation, token: 'one-time-token', email_delivery_status: 'not_requested' })
    render(<StoreInvitations accessToken="jwt" />)
    await user.click(await screen.findByRole('button', { name: 'New Invitation' }))
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(createStoreInvitation).toHaveBeenCalledWith('jwt', undefined)
    const link = await screen.findByLabelText('Invitation link')
    expect(link).toHaveValue(`${window.location.origin}/invite/one-time-token`)
    expect(screen.getByText(/expires in seven days/i)).toBeInTheDocument()
    expect(screen.getByText('Invitación creada. Copia el enlace para compartirlo.')).toBeInTheDocument()
    expect(screen.queryByText('Invitación creada y correo enviado.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByDisplayValue(/one-time-token/)).not.toBeInTheDocument()
    expect(window.localStorage.length).toBe(0)
  })

  it('validates email and supports recipient-restricted invitation creation', async () => {
    const user = userEvent.setup()
    vi.mocked(createStoreInvitation).mockResolvedValue({ invitation: { ...pendingInvitation, recipient_email: 'buyer@example.com' }, token: 'secret', email_delivery_status: 'sent' })
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
    expect(await screen.findByText('Invitación creada y correo enviado.')).toBeInTheDocument()
    expect(createStoreInvitation).toHaveBeenCalledWith('jwt', 'buyer@example.com')
  })

  it('copies the generated link and reports clipboard errors', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    vi.mocked(createStoreInvitation).mockResolvedValue({ invitation: pendingInvitation, token: 'copy-token', email_delivery_status: 'not_requested' })
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

  it('keeps copy link available when the invitation is created but email delivery fails', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    vi.mocked(createStoreInvitation).mockResolvedValue({ invitation: { ...pendingInvitation, recipient_email: 'buyer@example.com' }, token: 'manual-share-token', email_delivery_status: 'failed' })
    render(<StoreInvitations accessToken="jwt" />)
    await user.click(await screen.findByRole('button', { name: 'New Invitation' }))
    await user.type(screen.getByLabelText('Recipient email (optional)'), 'buyer@example.com')
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))

    expect(await screen.findByText('La invitación fue creada, pero no se pudo enviar el correo. Puedes copiar el enlace y compartirlo manualmente.')).toBeInTheDocument()
    expect(screen.queryByText('Invitación creada y correo enviado.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy Link' }))
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/invite/manual-share-token`)
  })

  it('confirms a resend, prevents duplicate submissions, and refreshes after success', async () => {
    const user = userEvent.setup()
    const emailedInvitation = { ...pendingInvitation, recipient_email: 'owner@example.test' }
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [emailedInvitation] })
    let resolveResend: ((value: { invitation: typeof emailedInvitation; email_delivery_status: 'sent' }) => void) | undefined
    vi.mocked(resendStoreInvitation).mockImplementationOnce(() => new Promise((resolve) => { resolveResend = resolve }))
    render(<StoreInvitations accessToken="jwt" />)

    await user.click(await screen.findByRole('button', { name: 'Resend Invitation' }))
    expect(screen.getByText('¿Deseas reenviar esta invitación a owner@example.test?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reenviar invitación' }))
    const sendingButton = await screen.findByRole('button', { name: 'Sending invitation' })
    expect(sendingButton).toBeDisabled()
    expect(resendStoreInvitation).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    resolveResend?.({ invitation: emailedInvitation, email_delivery_status: 'sent' })

    expect(await screen.findByText('La invitación se ha enviado nuevamente.')).toBeInTheDocument()
    expect(resendStoreInvitation).toHaveBeenCalledWith('jwt', emailedInvitation.id)
    expect(fetchStoreInvitations).toHaveBeenCalledTimes(2)
  })

  it('shows delivery failure without a false success and offers retry for failed invitations', async () => {
    const user = userEvent.setup()
    const emailedInvitation = { ...pendingInvitation, recipient_email: 'owner@example.test', last_delivery_status: 'failed' as const }
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [emailedInvitation] })
    vi.mocked(resendStoreInvitation).mockResolvedValue({ invitation: emailedInvitation, email_delivery_status: 'failed' })
    render(<StoreInvitations accessToken="jwt" />)

    await user.click(await screen.findByRole('button', { name: 'Retry Email' }))
    await user.click(screen.getByRole('button', { name: 'Reenviar invitación' }))
    expect(await screen.findByText('No se pudo enviar el correo. Inténtalo de nuevo.')).toBeInTheDocument()
    expect(screen.queryByText('La invitación se ha enviado nuevamente.')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Retry Email' })).toBeInTheDocument()
  })

  it('shows retry timing for rate limits and explains expired invitations need renewal', async () => {
    const user = userEvent.setup()
    const emailedInvitation = { ...pendingInvitation, recipient_email: 'owner@example.test' }
    const expiredInvitation = { ...pendingInvitation, id: 10, recipient_email: 'expired@example.test', status: 'expired' as const }
    vi.mocked(fetchStoreInvitations).mockResolvedValue({ invitations: [emailedInvitation, expiredInvitation] })
    vi.mocked(resendStoreInvitation).mockRejectedValue(new ApiRequestError('Try again later', 429, 60))
    render(<StoreInvitations accessToken="jwt" />)

    await user.click(await screen.findByRole('button', { name: 'Resend Invitation' }))
    await user.click(screen.getByRole('button', { name: 'Reenviar invitación' }))
    expect(await screen.findAllByText(/Límite de reenvíos alcanzado/)).toHaveLength(1)
    expect(await screen.findByRole('button', { name: /Reintentar en (?:1 min|\d+s)/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('button', { name: 'Renewal required' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Renewal required' })).toHaveAttribute('title', expect.stringContaining('Renewal is required'))
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
