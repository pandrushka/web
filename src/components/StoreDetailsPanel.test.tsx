import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { StoreProfile } from '../api/stores'
import { fetchAdminStore, fetchStore, updateStore } from '../api/stores'
import { StoreDetailsPanel } from './StoreDetailsPanel'

vi.mock('../api/stores', () => ({
  fetchAdminStore: vi.fn(),
  fetchStore: vi.fn(),
  updateStore: vi.fn(),
}))

const store: StoreProfile = {
  id: 5, name: 'Pulpería Centro', slug: 'pulperia-centro', description: 'Everyday items', logo_initial: 'P',
  phone_number: '+50588881234', city: 'León', address: 'Central street', directions: 'Near the park', status: 'draft', membership: { role: 'owner' },
}

describe('StoreDetailsPanel', () => {
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
})
