import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicStorefrontRoute } from './PublicStorefrontRoute'

const publicApi = vi.hoisted(() => ({
  fetchPublicStore: vi.fn(),
  fetchPublicCategories: vi.fn(),
  fetchPublicProducts: vi.fn(),
  fetchPublicProductImage: vi.fn(),
}))

vi.mock('../../api/publicStorefront', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api/publicStorefront')>()), ...publicApi }))

const soda = { id: 1, name: 'Soda', description: null, price: '12.50', unit: 'unidad', category: null, image: { present: false, thumbnail_path: null } }
const rice = { id: 2, name: 'Rice', description: 'One pound bag', price: '25.00', unit: 'libra', category: { id: 4, name: 'Grains' }, image: { present: false, thumbnail_path: null } }
const page = (products: typeof soda[], pageNumber = 1, totalPages = 1) => ({ products, pagination: { page: pageNumber, per_page: 24, total_count: totalPages * 24, total_pages: totalPages } })

describe('PublicStorefrontRoute', () => {
  beforeEach(() => {
    publicApi.fetchPublicStore.mockReset().mockResolvedValue({ store: { name: 'Tienda María', slug: 'tienda-maria', logo_initial: 'T', description: 'A neighborhood shop', city: 'Masaya' } })
    publicApi.fetchPublicCategories.mockReset().mockResolvedValue({ categories: [{ id: 4, name: 'Grains', position: 0 }] })
    publicApi.fetchPublicProducts.mockReset().mockImplementation((_slug: string, pageNumber = 1, _perPage = 24, filters = {}) => {
      void _slug
      void _perPage
      if (filters.categoryId === '4') return Promise.resolve(page(pageNumber === 1 ? [rice] : [{ ...rice, id: 3, name: 'Rice flour' }], pageNumber, 2))
      if (filters.q === 'rice') return Promise.resolve(page([rice]))
      return Promise.resolve(page(pageNumber === 1 ? [soda] : [rice], pageNumber, 2))
    })
  })

  it('fetches anonymous public data and renders shared storefront components with linked products', async () => {
    render(<PublicStorefrontRoute slug="tienda-maria" />)
    expect(await screen.findByRole('heading', { name: 'Tienda María' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Product catalog' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Soda/ })).toHaveAttribute('href', '/tienda-maria/products/1')
    expect(publicApi.fetchPublicStore).toHaveBeenCalledWith('tienda-maria', expect.any(AbortSignal))
    expect(publicApi.fetchPublicCategories).toHaveBeenCalledWith('tienda-maria', expect.any(AbortSignal))
    expect(publicApi.fetchPublicProducts).toHaveBeenCalledWith('tienda-maria', 1, 24, { q: '', categoryId: '' }, expect.any(AbortSignal))
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/preview — not published/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('searches and filters on the server, resets to page one, and loads filtered pagination', async () => {
    const user = userEvent.setup()
    render(<PublicStorefrontRoute slug="tienda-maria" />)
    await screen.findByText('Soda')
    await user.type(screen.getByRole('textbox', { name: 'Search products' }), 'rice')
    await waitFor(() => expect(publicApi.fetchPublicProducts).toHaveBeenLastCalledWith('tienda-maria', 1, 24, { q: 'rice', categoryId: '' }, expect.any(AbortSignal)))
    expect(await screen.findByText('Rice')).toBeInTheDocument()
    expect(screen.queryByText('Soda')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Search products' }))
    await waitFor(() => expect(publicApi.fetchPublicProducts).toHaveBeenLastCalledWith('tienda-maria', 1, 24, { q: '', categoryId: '' }, expect.any(AbortSignal)))
    await screen.findByText('Soda')
    await user.click(screen.getByRole('button', { name: 'Load more products' }))
    expect(await screen.findByText('Rice')).toBeInTheDocument()
    expect(publicApi.fetchPublicProducts).toHaveBeenLastCalledWith('tienda-maria', 2, 24, { q: '', categoryId: '' })

    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(screen.getByRole('option', { name: 'Grains' }))
    await waitFor(() => expect(publicApi.fetchPublicProducts).toHaveBeenLastCalledWith('tienda-maria', 1, 24, { q: '', categoryId: '4' }, expect.any(AbortSignal)))
    expect(await screen.findByText('Rice')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Grains' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load more products' }))
    expect(await screen.findByText('Rice flour')).toBeInTheDocument()
    expect(publicApi.fetchPublicProducts).toHaveBeenLastCalledWith('tienda-maria', 2, 24, { q: '', categoryId: '4' })
  })

  it('shows a retryable state for public catalog failures', async () => {
    publicApi.fetchPublicProducts.mockRejectedValueOnce(new Error('Network unavailable'))
    render(<PublicStorefrontRoute slug="tienda-maria" />)
    expect(await screen.findByText('Network unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Soda')).toBeInTheDocument()
  })

  it('ignores a slower response from an older search after a newer query is selected', async () => {
    let resolveSlow: ((value: ReturnType<typeof page>) => void) | undefined
    let resolveFresh: ((value: ReturnType<typeof page>) => void) | undefined
    publicApi.fetchPublicProducts.mockImplementation((_slug: string, _page = 1, _perPage = 24, filters = {}) => {
      void _slug
      void _page
      void _perPage
      if (filters.q === 'slow') return new Promise((resolve) => { resolveSlow = resolve })
      if (filters.q === 'fresh') return new Promise((resolve) => { resolveFresh = resolve })
      return Promise.resolve(page([soda]))
    })
    render(<PublicStorefrontRoute slug="tienda-maria" />)
    await screen.findByText('Soda')
    const search = screen.getByRole('textbox', { name: 'Search products' })
    fireEvent.change(search, { target: { value: 'slow' } })
    await waitFor(() => expect(resolveSlow).toBeDefined(), { timeout: 1000 })
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'fresh' } })
    await waitFor(() => expect(resolveFresh).toBeDefined(), { timeout: 1000 })
    resolveFresh?.(page([{ ...rice, name: 'Fresh result' }]))
    expect(await screen.findByText('Fresh result')).toBeInTheDocument()
    resolveSlow?.(page([{ ...rice, name: 'Stale result' }]))
    await waitFor(() => expect(screen.queryByText('Stale result')).not.toBeInTheDocument())
    expect(screen.getByText('Fresh result')).toBeInTheDocument()
  })
})
