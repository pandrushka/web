import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../api/client'
import type { StoreProfile } from '../api/stores'
import { fetchAdminStore, fetchStore, publishStore, unpublishStore, updateStore } from '../api/stores'
import { fetchCategories, fetchProducts } from '../api/catalog'
import { StoreDetailsPanel } from './StoreDetailsPanel'

vi.mock('../api/stores', () => ({
  fetchAdminStore: vi.fn(),
  fetchStore: vi.fn(),
  updateStore: vi.fn(),
  publishStore: vi.fn(),
  unpublishStore: vi.fn(),
}))

vi.mock('../api/catalog', () => ({
  fetchCategories: vi.fn().mockResolvedValue({ categories: [] }),
  fetchProducts: vi.fn().mockResolvedValue({ products: [] }),
}))

const store: StoreProfile = {
  id: 5, name: 'Pulpería Centro', slug: 'pulperia-centro', description: 'Everyday items', logo_initial: 'P',
  phone_number: '+50588881234', city: 'León', address: 'Central street', directions: 'Near the park', status: 'draft', membership: { role: 'owner' },
}

describe('StoreDetailsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })
    vi.mocked(fetchProducts).mockResolvedValue({ products: [] })
  })

  it('loads member details, submits only editable fields, and shows the updated response', async () => {
    const updated: StoreProfile = { ...store, name: 'Pulpería Nueva', city: 'Managua' }
    vi.mocked(fetchStore).mockResolvedValue({ store })
    vi.mocked(updateStore).mockResolvedValue({ store: updated })
    const onStoreUpdated = vi.fn()
    render(<StoreDetailsPanel storeId={5} accessToken="member-token" source="member" editable onStoreUpdated={onStoreUpdated} />)

    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(screen.getByText('pulperia-centro')).toBeInTheDocument()
    expect(screen.getByText('Everyday items')).toBeInTheDocument()
    expect(screen.getByText('Central street')).toBeInTheDocument()
    expect(fetchStore).toHaveBeenCalledWith('member-token', 5)
    fireEvent.click(screen.getByRole('button', { name: /edit store details/i }))
    expect(screen.queryByRole('textbox', { name: /url slug/i })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Store name' }), { target: { value: 'Pulpería Nueva' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'Managua' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateStore).toHaveBeenCalledWith('member-token', 5, {
      name: 'Pulpería Nueva', description: 'Everyday items', logo_initial: 'P', phone_number: '+50588881234', city: 'Managua', address: 'Central street', directions: 'Near the park',
    }))
    expect(await screen.findByRole('heading', { name: 'Pulpería Nueva' })).toBeInTheDocument()
    expect(screen.getByText('Managua')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Store details' })).toHaveLength(2)
    expect(onStoreUpdated).toHaveBeenLastCalledWith(updated)
  })

  it('uses platform detail endpoint and renders a read-only card with a back action', async () => {
    vi.mocked(fetchAdminStore).mockResolvedValue({ store: { ...store, membership: undefined } })
    const onBack = vi.fn()
    render(<StoreDetailsPanel storeId={5} accessToken="platform-token" source="platform" editable={false} onBack={onBack} onStoreUpdated={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(fetchAdminStore).toHaveBeenCalledWith('platform-token', 5)
    expect(screen.queryByRole('button', { name: /edit store details/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to All Stores' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('previews a draft store from the owner endpoint and returns to store management', async () => {
    vi.mocked(fetchStore).mockResolvedValue({ store })
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [{ id: 3, name: 'Bebidas', position: 1, active: true, created_at: '', updated_at: '' }] })
    vi.mocked(fetchProducts).mockResolvedValue({ products: [{ id: 20, name: 'Soda', description: null, price: '10.25', unit: 'unidad', available: true, active: true, category_id: 3, category: { id: 3, name: 'Bebidas', active: true }, created_at: '', updated_at: '' }] })
    render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(fetchStore).toHaveBeenCalledWith('owner-token', 5)
    fireEvent.click(screen.getByRole('button', { name: 'Preview Store' }))
    expect(await screen.findByText('Preview — Not Published')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchCategories).toHaveBeenCalledWith('owner-token', 5, 'member')
      expect(fetchProducts).toHaveBeenCalledWith('owner-token', 5, 'member')
    })
    expect(await screen.findByText('Soda')).toBeInTheDocument()
    expect(screen.getByText('C$ 10.25')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: store.name })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Return to Dashboard' }))
    expect(await screen.findByRole('button', { name: /edit store details/i })).toBeInTheDocument()
  })

  it('previews any store through the platform endpoint without granting edit controls', async () => {
    vi.mocked(fetchAdminStore).mockResolvedValue({ store: { ...store, membership: undefined } })
    render(<StoreDetailsPanel storeId={5} accessToken="platform-token" source="platform" editable={false} onStoreUpdated={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(fetchAdminStore).toHaveBeenCalledWith('platform-token', 5)
    expect(screen.queryByRole('button', { name: /edit store details/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Preview Store' }))
    expect(await screen.findByText('Preview — Not Published')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchCategories).toHaveBeenCalledWith('platform-token', 5, 'platform')
      expect(fetchProducts).toHaveBeenCalledWith('platform-token', 5, 'platform')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Return to Dashboard' }))
    expect(await screen.findByRole('button', { name: 'Preview Store' })).toBeInTheDocument()
  })

  it('shows forbidden, missing, and retryable general errors', async () => {
    vi.mocked(fetchAdminStore).mockRejectedValueOnce(new Error('Forbidden'))
    const { rerender } = render(<StoreDetailsPanel storeId={9} accessToken="platform-token" source="platform" editable={false} onStoreUpdated={vi.fn()} />)
    expect(await screen.findByText('You do not have permission to view this store.')).toBeInTheDocument()

    vi.mocked(fetchAdminStore).mockRejectedValueOnce(new Error('Store not found'))
    rerender(<StoreDetailsPanel storeId={10} accessToken="platform-token" source="platform" editable={false} onStoreUpdated={vi.fn()} />)
    expect(await screen.findByText('This store could not be found.')).toBeInTheDocument()

    vi.mocked(fetchAdminStore).mockRejectedValueOnce(new Error('Network is unavailable'))
    rerender(<StoreDetailsPanel storeId={11} accessToken="platform-token" source="platform" editable={false} onStoreUpdated={vi.fn()} />)
    expect(await screen.findByText('Network is unavailable')).toBeInTheDocument()
    vi.mocked(fetchAdminStore).mockResolvedValueOnce({ store })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument()
  })

  it('shows owner publication controls, confirms publishing, refreshes status, and exposes the public link', async () => {
    vi.mocked(fetchStore).mockResolvedValue({ store })
    vi.mocked(publishStore).mockResolvedValue({ store: { ...store, status: 'active' } })
    const onStoreUpdated = vi.fn()
    render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={onStoreUpdated} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Publish Store' }))
    expect(await screen.findByRole('dialog', { name: 'Publish this store?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(publishStore).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Publish Store' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!)
    await waitFor(() => expect(publishStore).toHaveBeenCalledWith('owner-token', 5))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Store published.')).toBeInTheDocument()
    expect(onStoreUpdated).toHaveBeenLastCalledWith({ ...store, status: 'active' })
    expect(screen.getByRole('button', { name: 'Unpublish Store' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Public Store' })).toHaveAttribute('href', '/pulperia-centro')
  })

  it('uses the authoritative Rails response after unpublishing', async () => {
    const activeStore = { ...store, status: 'active' as const }
    const draftStore = { ...store, status: 'draft' as const }
    vi.mocked(fetchStore).mockResolvedValue({ store: activeStore })
    vi.mocked(unpublishStore).mockResolvedValue({ store: draftStore })
    const onStoreUpdated = vi.fn()
    render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={onStoreUpdated} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Unpublish Store' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!)

    expect(await screen.findByText('Store unpublished.')).toBeInTheDocument()
    expect(onStoreUpdated).toHaveBeenLastCalledWith(draftStore)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Publish Store' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open Public Store' })).not.toBeInTheDocument()
  })

  it('refreshes the authoritative store after a 409 and updates publication actions', async () => {
    const activeStore = { ...store, status: 'active' as const }
    vi.mocked(fetchStore)
      .mockResolvedValueOnce({ store })
      .mockResolvedValueOnce({ store: activeStore })
    vi.mocked(publishStore).mockRejectedValue(new ApiRequestError('La tienda no puede cambiar de active a active', 409))
    const onStoreUpdated = vi.fn()
    render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={onStoreUpdated} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Publish Store' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!)

    expect(await screen.findByText('La tienda no puede cambiar de active a active')).toBeInTheDocument()
    expect(fetchStore).toHaveBeenNthCalledWith(2, 'owner-token', 5)
    expect(onStoreUpdated).toHaveBeenLastCalledWith(activeStore)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Unpublish Store' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Public Store' })).toBeInTheDocument()
    expect(screen.queryByText('Store published.')).not.toBeInTheDocument()
  })

  it.each([
    ['Spanish', 'La tienda no puede cambiar de active a active'],
    ['English', 'Store cannot transition from active to active'],
  ])('preserves the localized %s conflict if refreshing status also fails', async (_language, conflictMessage) => {
    vi.mocked(fetchStore).mockResolvedValueOnce({ store }).mockRejectedValueOnce(new Error('Network unavailable'))
    vi.mocked(publishStore).mockRejectedValue(new ApiRequestError(conflictMessage, 409))
    render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Publish Store' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(conflictMessage)
    expect(alert).toHaveTextContent('The current store status could not be refreshed.')
    expect(screen.queryByText('Store published.')).not.toBeInTheDocument()
  })

  it('prevents duplicate publication requests while a request is pending', async () => {
    let resolvePublish: ((value: { store: StoreProfile }) => void) | undefined
    vi.mocked(fetchStore).mockResolvedValue({ store })
    vi.mocked(publishStore).mockImplementation(() => new Promise((resolve) => { resolvePublish = resolve }))
    render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Publish Store' }))
    const publishButton = screen.getByRole('dialog').querySelector('button:last-child')!
    fireEvent.click(publishButton)
    fireEvent.click(publishButton)
    await waitFor(() => expect(publishStore).toHaveBeenCalledTimes(1))
    expect(publishButton).toBeDisabled()

    await act(async () => resolvePublish?.({ store: { ...store, status: 'active' } }))
    expect(await screen.findByText('Store published.')).toBeInTheDocument()
  })

  it('ignores a publication response after the selected store or account changes', async () => {
    let resolvePublish: ((value: { store: StoreProfile }) => void) | undefined
    const otherStore = { ...store, id: 6, name: 'Pulpería Norte', slug: 'pulperia-norte' }
    vi.mocked(fetchStore).mockResolvedValueOnce({ store }).mockResolvedValueOnce({ store: otherStore })
    vi.mocked(publishStore).mockImplementation(() => new Promise((resolve) => { resolvePublish = resolve }))
    const onStoreUpdated = vi.fn()
    const { rerender } = render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={onStoreUpdated} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Publish Store' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!)
    await waitFor(() => expect(publishStore).toHaveBeenCalledOnce())

    rerender(<StoreDetailsPanel storeId={6} accessToken="other-account-token" source="member" editable onStoreUpdated={onStoreUpdated} />)
    expect(await screen.findByRole('heading', { name: otherStore.name })).toBeInTheDocument()
    onStoreUpdated.mockClear()

    await act(async () => resolvePublish?.({ store: { ...store, status: 'active' } }))
    expect(screen.getByRole('heading', { name: otherStore.name })).toBeInTheDocument()
    expect(onStoreUpdated).not.toHaveBeenCalled()
    expect(screen.queryByText('Store published.')).not.toBeInTheDocument()
  })

  it('does not show publication actions to admins or platform-only users', async () => {
    vi.mocked(fetchStore).mockResolvedValue({ store: { ...store, membership: { role: 'admin' } } })
    const { rerender } = render(<StoreDetailsPanel storeId={5} accessToken="admin-token" source="member" editable onStoreUpdated={vi.fn()} />)
    expect(await screen.findByRole('button', { name: /edit store details/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish Store' })).not.toBeInTheDocument()

    vi.mocked(fetchAdminStore).mockResolvedValue({ store: { ...store, membership: undefined } })
    rerender(<StoreDetailsPanel storeId={5} accessToken="platform-token" source="platform" editable={false} onStoreUpdated={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish Store' })).not.toBeInTheDocument()

    vi.mocked(fetchStore).mockResolvedValue({ store: { ...store, membership: { role: 'employee' } } })
    rerender(<StoreDetailsPanel storeId={5} accessToken="employee-token" source="member" editable onStoreUpdated={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish Store' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unpublish Store' })).not.toBeInTheDocument()
  })

  it('allows dual-role owners to publish through member endpoints while viewing platform data', async () => {
    vi.mocked(fetchAdminStore).mockResolvedValue({ store: { ...store, membership: undefined } })
    vi.mocked(publishStore).mockResolvedValue({ store: { ...store, status: 'active', membership: { role: 'owner' } } })
    render(<StoreDetailsPanel storeId={5} accessToken="dual-token" source="platform" editable={false} membershipRole="owner" onStoreUpdated={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Publish Store' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!)
    await waitFor(() => expect(publishStore).toHaveBeenCalledWith('dual-token', 5))
  })

  it('shows publication failures and provides active store links', async () => {
    vi.mocked(fetchStore).mockResolvedValue({ store: { ...store, status: 'active' } })
    vi.mocked(unpublishStore).mockRejectedValue(new Error('Forbidden'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<StoreDetailsPanel storeId={5} accessToken="owner-token" source="member" editable onStoreUpdated={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Unpublish Store' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!)
    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Copy Store Link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/pulperia-centro`))
    expect(screen.getByRole('link', { name: 'Open Public Store' })).toHaveAttribute('href', '/pulperia-centro')
  })
})
