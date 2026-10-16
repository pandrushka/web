import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CatalogCategory, CatalogProduct } from '../../../api/catalog'
import { StorefrontProductCatalog } from './StorefrontProductCatalog'

const categories: CatalogCategory[] = [
  { id: 1, name: 'Bebidas', position: 1, active: true, created_at: '', updated_at: '' },
  { id: 2, name: 'Snacks archivados', position: 2, active: false, created_at: '', updated_at: '' },
]
const product = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
  id: 10, name: 'Soda', description: 'Cold drink', price: '12.50', unit: 'unidad', available: true, active: true,
  category_id: 1, category: { id: 1, name: 'Bebidas', active: true }, created_at: '', updated_at: '', ...overrides,
})
const base = { categories, products: [product({}), product({ id: 11, name: 'Rice', price: '25.00', category_id: 2, category: { id: 2, name: 'Snacks archivados', active: false } }), product({ id: 12, name: 'Hidden', active: false }), product({ id: 13, name: 'Unavailable', available: false })], loading: false, error: null }

describe('StorefrontProductCatalog', () => {
  it('shows only active available products, exact Córdobas strings, descriptions, units, and archived-category products in fallback', () => {
    render(<StorefrontProductCatalog {...base} />)
    expect(screen.getByText('Soda')).toBeInTheDocument()
    expect(screen.getAllByText('Cold drink')).toHaveLength(2)
    expect(screen.getByText('C$ 12.50')).toBeInTheDocument()
    expect(screen.getAllByText('/ unidad')).toHaveLength(2)
    expect(screen.getByRole('region', { name: 'Bebidas' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Other products' })).toHaveTextContent('Rice')
    expect(screen.queryByText('Snacks archivados')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
  })

  it('filters by product name and active category', () => {
    render(<StorefrontProductCatalog {...base} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'sod' } })
    expect(screen.getByText('Soda')).toBeInTheDocument()
    expect(screen.queryByText('Rice')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: '' } })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }))
    fireEvent.click(screen.getByRole('option', { name: 'Bebidas' }))
    expect(screen.getByText('Soda')).toBeInTheDocument()
    expect(screen.queryByText('Rice')).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Snacks archivados' })).not.toBeInTheDocument()
  })

  it('shows empty, loading, and retryable API error states', () => {
    const retry = vi.fn()
    const { rerender } = render(<StorefrontProductCatalog categories={[]} products={[]} loading={false} error={null} />)
    expect(screen.getByText('No products are available yet.')).toBeInTheDocument()
    rerender(<StorefrontProductCatalog {...base} loading />)
    expect(screen.getByLabelText('Loading product catalog')).toBeInTheDocument()
    rerender(<StorefrontProductCatalog {...base} loading={false} error="Could not load catalog" onRetry={retry} />)
    expect(screen.getByText('Could not load catalog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('renders a single-column product layout at narrow widths', () => {
    render(<StorefrontProductCatalog {...base} />)
    expect(screen.getAllByTestId('storefront-product-grid').length).toBeGreaterThan(0)
    expect(screen.getByRole('textbox', { name: 'Search products' })).toBeVisible()
  })

  it('accepts authenticated image presentation without coupling catalog layout to image loading', () => {
    const productWithImage = product({ image: { present: true, thumbnail_path: '/api/v1/admin/stores/8/products/10/image' } })
    const renderProductImage = vi.fn((item: CatalogProduct) => <img src={item.image?.thumbnail_path ?? undefined} alt={`${item.name} image`} />)
    render(<StorefrontProductCatalog {...base} products={[productWithImage]} renderProductImage={renderProductImage} />)

    expect(screen.getByRole('img', { name: 'Soda image' })).toHaveAttribute('src', '/api/v1/admin/stores/8/products/10/image')
    expect(renderProductImage).toHaveBeenCalledWith(productWithImage)
  })
})
