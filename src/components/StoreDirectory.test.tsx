import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAllStores, fetchMyStores } from '../api/stores'
import { StoreDirectory } from './StoreDirectory'

vi.mock('../api/stores', () => ({
  fetchAllStores: vi.fn(),
  fetchMyStores: vi.fn(),
}))

const store = {
  id: 8,
  name: 'La Esquina',
  slug: 'la-esquina',
  description: null,
  logo_initial: 'L',
  phone_number: null,
  city: 'León',
  address: null,
  directions: null,
  status: 'draft',
  membership: { role: 'owner' },
}

beforeEach(() => {
  vi.mocked(fetchMyStores).mockReset()
  vi.mocked(fetchAllStores).mockReset()
})

describe('StoreDirectory', () => {
  it('loads member stores and displays profile, status, and membership role', async () => {
    vi.mocked(fetchMyStores).mockResolvedValue({ stores: [store] })
    const onLoaded = vi.fn()
    render(<StoreDirectory kind="member" accessToken="access-token" onMemberStoresLoaded={onLoaded} />)

    expect(screen.getByRole('progressbar', { name: /loading stores/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'La Esquina' })).toBeInTheDocument()
    expect(screen.getByText('León')).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('Store Owner')).toBeInTheDocument()
    expect(fetchMyStores).toHaveBeenCalledWith('access-token')
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith([store]))
  })

  it('labels each store card from the returned membership role', async () => {
    vi.mocked(fetchMyStores).mockResolvedValue({ stores: [
      { ...store, id: 1, name: 'Owner Shop', membership: { role: 'owner' } },
      { ...store, id: 2, name: 'Admin Shop', membership: { role: 'admin' } },
      { ...store, id: 3, name: 'Employee Shop', membership: { role: 'employee' } },
    ] })
    render(<StoreDirectory kind="member" accessToken="access-token" />)

    expect(await screen.findByText('Store Owner')).toBeInTheDocument()
    expect(screen.getByText('Store Admin')).toBeInTheDocument()
    expect(screen.getByText('Employee')).toBeInTheDocument()
  })

  it('loads platform stores with pagination', async () => {
    vi.mocked(fetchAllStores).mockResolvedValue({ stores: [store], pagination: { page: 1, per_page: 25, total_count: 30, total_pages: 2 } })
    render(<StoreDirectory kind="platform" accessToken="admin-token" />)

    expect(await screen.findByRole('heading', { name: 'La Esquina' })).toBeInTheDocument()
    expect(screen.getByText(/page 1 of 2 · 30 stores/i)).toBeInTheDocument()
    expect(fetchAllStores).toHaveBeenCalledWith('admin-token', 1)
  })

  it('allows selecting stores through the accessible card action', async () => {
    vi.mocked(fetchAllStores).mockResolvedValue({ stores: [store], pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 } })
    const onSelectStore = vi.fn()
    render(<StoreDirectory kind="platform" accessToken="admin-token" onSelectStore={onSelectStore} />)
    fireEvent.click(await screen.findByRole('button', { name: 'View La Esquina details' }))
    expect(onSelectStore).toHaveBeenCalledWith(store)
  })

  it('shows empty and error states', async () => {
    vi.mocked(fetchMyStores).mockResolvedValue({ stores: [] })
    const { rerender } = render(<StoreDirectory kind="member" accessToken="access-token" />)
    expect(await screen.findByText('No store access yet')).toBeInTheDocument()

    vi.mocked(fetchMyStores).mockRejectedValue(new Error('Not authorized'))
    rerender(<StoreDirectory kind="member" accessToken="different-token" />)
    expect(await screen.findByText('Not authorized')).toBeInTheDocument()
  })

  it('displays active, draft, and suspended platform stores from the API response', async () => {
    vi.mocked(fetchAllStores).mockResolvedValue({
      stores: [
        { ...store, id: 1, name: 'Active Shop', status: 'active' },
        { ...store, id: 2, name: 'Draft Shop', status: 'draft' },
        { ...store, id: 3, name: 'Suspended Shop', status: 'suspended' },
      ],
      pagination: { page: 1, per_page: 25, total_count: 3, total_pages: 1 },
    })
    render(<StoreDirectory kind="platform" accessToken="admin-token" />)

    expect(await screen.findByRole('heading', { name: 'Active Shop' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Draft Shop' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suspended Shop' })).toBeInTheDocument()
  })

  it('shows empty and API error states for platform listings', async () => {
    vi.mocked(fetchAllStores).mockResolvedValue({ stores: [], pagination: { page: 1, per_page: 25, total_count: 0, total_pages: 0 } })
    const { rerender } = render(<StoreDirectory kind="platform" accessToken="admin-token" />)
    expect(await screen.findByText('No stores found')).toBeInTheDocument()

    vi.mocked(fetchAllStores).mockRejectedValue(new Error('Platform listing unavailable'))
    rerender(<StoreDirectory kind="platform" accessToken="new-admin-token" />)
    expect(await screen.findByText('Platform listing unavailable')).toBeInTheDocument()
  })
})
