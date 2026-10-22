import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicStoreDirectoryRoute } from './PublicStoreDirectoryRoute'

const publicApi = vi.hoisted(() => ({ fetchPublicStores: vi.fn() }))
vi.mock('../../api/publicStorefront', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api/publicStorefront')>()), ...publicApi }))

const pagination = { page: 1, per_page: 24, total_count: 1, total_pages: 1 }

describe('PublicStoreDirectoryRoute', () => {
  beforeEach(() => {
    publicApi.fetchPublicStores.mockReset().mockResolvedValue({ stores: [{ name: 'Tienda María', slug: 'tienda-maria', logo_initial: 'T', description: 'Local groceries', city: 'Masaya' }], pagination })
  })

  it('loads anonymously, shows only public profile fields, and links to the public storefront', async () => {
    render(<PublicStoreDirectoryRoute />)
    expect(await screen.findByRole('heading', { name: 'Tienda María' })).toBeInTheDocument()
    expect(screen.getByText('Masaya')).toBeInTheDocument()
    expect(screen.getByText('Local groceries')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit Tienda María' })).toHaveAttribute('href', '/tienda-maria')
    expect(publicApi.fetchPublicStores).toHaveBeenCalledWith({ q: '', city: '', page: 1, perPage: 24 }, expect.any(AbortSignal))
  })

  it('sends debounced name/city search and supports server pagination', async () => {
    const user = userEvent.setup()
    publicApi.fetchPublicStores.mockResolvedValue({ stores: [{ name: 'Tienda María', slug: 'tienda-maria', logo_initial: 'T', description: null, city: 'Masaya' }], pagination: { page: 1, per_page: 24, total_count: 30, total_pages: 2 } })
    render(<PublicStoreDirectoryRoute />)
    await screen.findByText('Masaya')
    await user.type(screen.getByRole('textbox', { name: 'Search stores or cities' }), 'maria')
    await user.type(screen.getByRole('textbox', { name: 'Filter by city' }), 'Masaya')
    await waitFor(() => expect(publicApi.fetchPublicStores).toHaveBeenLastCalledWith({ q: 'maria', city: 'Masaya', page: 1, perPage: 24 }, expect.any(AbortSignal)))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(publicApi.fetchPublicStores).toHaveBeenLastCalledWith({ q: 'maria', city: 'Masaya', page: 2, perPage: 24 }, expect.any(AbortSignal)))
  })

  it('shows empty and retryable error states', async () => {
    publicApi.fetchPublicStores.mockResolvedValueOnce({ stores: [], pagination: { page: 1, per_page: 24, total_count: 0, total_pages: 0 } })
    const { rerender } = render(<PublicStoreDirectoryRoute />)
    expect(await screen.findByText('No stores match your search.')).toBeInTheDocument()
    publicApi.fetchPublicStores.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ stores: [], pagination: { page: 1, per_page: 24, total_count: 0, total_pages: 0 } })
    rerender(<PublicStoreDirectoryRoute key="retry" />)
    expect(await screen.findByText('Network unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No stores match your search.')).toBeInTheDocument()
  })
})
