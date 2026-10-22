import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicProductDetailRoute } from './PublicProductDetailRoute'
import { PublicStorefrontApiError } from '../../api/publicStorefront'

const publicApi = vi.hoisted(() => ({ fetchPublicStore: vi.fn(), fetchPublicProduct: vi.fn() }))
vi.mock('../../api/publicStorefront', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api/publicStorefront')>()), ...publicApi }))

describe('PublicProductDetailRoute', () => {
  beforeEach(() => {
    publicApi.fetchPublicStore.mockReset().mockResolvedValue({ store: { name: 'Tienda María', slug: 'tienda-maria', logo_initial: 'T', description: null, city: 'Masaya' } })
    publicApi.fetchPublicProduct.mockReset().mockResolvedValue({ product: { id: 3, name: 'Arroz', description: 'Grano local', price: '32.50', unit: 'libra', category: { id: 2, name: 'Granos' }, image: { present: false, thumbnail_path: null } } })
  })

  it('loads a public product and links back to its store without authentication', async () => {
    render(<PublicProductDetailRoute slug="tienda-maria" productId="3" />)
    expect(await screen.findByRole('heading', { name: 'Arroz' })).toBeInTheDocument()
    expect(screen.getByText('C$ 32.50')).toBeInTheDocument()
    expect(screen.getByText('Grano local')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to store' })).toHaveAttribute('href', '/tienda-maria')
    expect(publicApi.fetchPublicStore).toHaveBeenCalledWith('tienda-maria', expect.any(AbortSignal))
    expect(publicApi.fetchPublicProduct).toHaveBeenCalledWith('tienda-maria', '3', expect.any(AbortSignal))
  })

  it('renders a customer-friendly unavailable state for missing products', async () => {
    publicApi.fetchPublicProduct.mockRejectedValue(new PublicStorefrontApiError('Product not found', 404))
    render(<PublicProductDetailRoute slug="tienda-maria" productId="999" />)
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to store' })).toHaveAttribute('href', '/tienda-maria')
  })
})
