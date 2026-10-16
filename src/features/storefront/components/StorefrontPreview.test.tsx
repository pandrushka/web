import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { StoreProfile } from '../../../api/stores'
import { StorefrontPreview } from './StorefrontPreview'
import { useStorefrontCatalog } from '../useStorefrontCatalog'

vi.mock('../useStorefrontCatalog', () => ({ useStorefrontCatalog: vi.fn() }))
vi.mock('../../catalog/ProductImage', () => ({ ProductImage: (props: { path: string | null; accessToken: string; cacheScope: string; alt: string }) => <img src={props.path ?? undefined} alt={props.alt} data-token={props.accessToken} data-scope={props.cacheScope} /> }))

const store: StoreProfile = {
  id: 8, name: 'Pulpería Centro', slug: 'pulperia-centro', description: null, logo_initial: 'P', phone_number: null,
  city: 'León', address: null, directions: null, status: 'draft',
}
const product = {
  id: 10, name: 'Arroz', description: null, price: '20.00', unit: 'libra' as const, available: true, active: true,
  category_id: null, category: null, created_at: '', updated_at: '',
  image: { present: true, thumbnail_path: '/api/v1/admin/stores/8/products/10/image' },
}

describe('StorefrontPreview product images', () => {
  it.each([
    ['member', '/api/v1/stores/8/products/10/image'],
    ['platform', '/api/v1/admin/stores/8/products/10/image'],
  ] as const)('uses the %s catalog thumbnail path and authenticated image context', (catalogSource, path) => {
    const refreshAccessToken = vi.fn()
    vi.mocked(useStorefrontCatalog).mockReturnValue({ categories: [], products: [{ ...product, image: { present: true, thumbnail_path: path } }], loading: false, error: null, retry: vi.fn() })

    render(<StorefrontPreview store={store} accessToken="access-jwt" catalogSource={catalogSource} cacheScope="user-7" refreshAccessToken={refreshAccessToken} onReturn={vi.fn()} />)

    const image = screen.getByRole('img', { name: 'Arroz image' })
    expect(image).toHaveAttribute('src', path)
    expect(image).toHaveAttribute('data-token', 'access-jwt')
    expect(image).toHaveAttribute('data-scope', 'user-7')
  })
})

describe('StorefrontPreview publication status', () => {
  it.each([
    ['draft', 'Preview — Not Published'],
    ['active', 'Preview — Published Store'],
    ['suspended', 'Preview — Store Suspended'],
  ])('labels %s stores accurately', (status, label) => {
    vi.mocked(useStorefrontCatalog).mockReturnValue({ categories: [], products: [], loading: false, error: null, retry: vi.fn() })
    render(<StorefrontPreview store={{ ...store, status }} accessToken="token" catalogSource="member" onReturn={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent(label)
  })
})
