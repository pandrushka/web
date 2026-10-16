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

vi.mock('../../api/publicStorefront', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/publicStorefront')>()),
  ...publicApi,
}))

const firstProduct = { id: 1, name: 'Soda', description: null, price: '12.50', unit: 'unidad', category: null, image: { present: false, thumbnail_path: null } }
const laterProduct = { id: 2, name: 'Rice', description: 'One pound bag', price: '25.00', unit: 'libra', category: { id: 4, name: 'Grains' }, image: { present: false, thumbnail_path: null } }

describe('PublicStorefrontRoute', () => {
  beforeEach(() => {
    publicApi.fetchPublicStore.mockReset().mockResolvedValue({ store: { name: 'Tienda María', slug: 'tienda-maria', logo_initial: 'T', description: 'A neighborhood shop', city: 'Masaya' } })
    publicApi.fetchPublicCategories.mockReset().mockResolvedValue({ categories: [{ id: 4, name: 'Grains', position: 0 }] })
    publicApi.fetchPublicProducts.mockReset().mockImplementation((_slug: string, page = 1) => Promise.resolve({
      products: page === 1 ? [firstProduct] : [laterProduct],
      pagination: { page, per_page: 24, total_count: 2, total_pages: 2 },
    }))
  })

  it('fetches the public store first and renders shared storefront components without management UI', async () => {
    render(<PublicStorefrontRoute slug="tienda-maria" />)

    expect(await screen.findByRole('heading', { name: 'Tienda María' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Product catalog' })).toBeInTheDocument()
    expect(screen.getByText('Soda')).toBeInTheDocument()
    expect(publicApi.fetchPublicStore).toHaveBeenCalledWith('tienda-maria')
    await waitFor(() => expect(publicApi.fetchPublicCategories).toHaveBeenCalledWith('tienda-maria'))
    expect(publicApi.fetchPublicProducts).toHaveBeenCalledWith('tienda-maria')
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/preview — not published/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('supports loading more and avoids a false empty search result before later pages load', async () => {
    const user = userEvent.setup()
    render(<PublicStorefrontRoute slug="tienda-maria" />)

    await screen.findByText('Soda')
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'rice' } })
    expect(screen.getByText(/load more to search the rest of the catalog/i)).toBeInTheDocument()
    expect(screen.queryByText('No products match these filters.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load more products' }))
    expect(await screen.findByText('Rice')).toBeInTheDocument()
    expect(screen.getByText('C$ 25.00')).toBeInTheDocument()
    expect(publicApi.fetchPublicProducts).toHaveBeenLastCalledWith('tienda-maria', 2, 24)
    expect(screen.getByRole('img', { name: 'Rice image placeholder' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more products' })).not.toBeInTheDocument()
  })

  it('keeps category filtering informative until additional product pages are loaded', async () => {
    const user = userEvent.setup()
    render(<PublicStorefrontRoute slug="tienda-maria" />)

    await screen.findByText('Soda')
    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(screen.getByRole('option', { name: 'Grains' }))
    expect(screen.getByText(/load more to search the rest of the catalog/i)).toBeInTheDocument()
    expect(screen.queryByText('No products match these filters.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load more products' }))
    expect(await screen.findByText('Rice')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Grains' })).toBeInTheDocument()
  })
})
