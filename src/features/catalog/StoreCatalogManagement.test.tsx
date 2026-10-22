import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { archiveCategory, archiveProduct, createCategory, createProduct, fetchCategories, fetchProducts, updateCategory, updateProduct } from '../../api/catalog'
import type { CatalogCategory, CatalogProduct } from '../../api/catalog'
import type { StoreProfile } from '../../api/stores'
import { StoreCatalogManagement } from './StoreCatalogManagement'

vi.mock('../../api/catalog', () => ({
  archiveCategory: vi.fn(), archiveProduct: vi.fn(), createCategory: vi.fn(), createProduct: vi.fn(),
  fetchCategories: vi.fn(), fetchProducts: vi.fn(), updateCategory: vi.fn(), updateProduct: vi.fn(),
  PRODUCT_UNITS: ['unidad', 'libra', 'kilogramo', 'gramo', 'litro', 'paquete', 'docena'],
}))
vi.mock('../../api/productImages', () => ({ uploadProductImage: vi.fn(), removeProductImage: vi.fn() }))
vi.mock('./ProductImage', () => ({ ProductImage: ({ path, alt }: { path?: string | null; alt: string }) => path ? <img src={path} alt={alt} /> : <div role="img" aria-label={`${alt} placeholder`} /> }))

import { removeProductImage, uploadProductImage } from '../../api/productImages'

const store: StoreProfile = {
  id: 8, name: 'Pulpería Centro', slug: 'pulperia-centro', description: null, logo_initial: 'P', phone_number: null,
  city: 'León', address: null, directions: null, status: 'draft', membership: { role: 'owner' },
}
const categories: CatalogCategory[] = [
  { id: 2, name: 'Bebidas', position: 0, active: true, created_at: '', updated_at: '' },
  { id: 3, name: 'Granos', position: 1, active: false, created_at: '', updated_at: '' },
]
const products: CatalogProduct[] = [
  { id: 10, name: 'Gaseosa', description: 'Botella pequeña', price: '12.50', unit: 'unidad', available: true, active: true, category_id: 2, category: { id: 2, name: 'Bebidas', active: true }, created_at: '', updated_at: '' },
  { id: 11, name: 'Arroz', description: null, price: '20.00', unit: 'libra', available: false, active: true, category_id: 3, category: { id: 3, name: 'Granos', active: false }, created_at: '', updated_at: '' },
  { id: 12, name: 'Frijoles', description: null, price: '24.00', unit: 'libra', available: true, active: false, category_id: null, category: null, created_at: '', updated_at: '' },
]

function renderCatalog(overrides: Partial<React.ComponentProps<typeof StoreCatalogManagement>> = {}) {
  return render(<StoreCatalogManagement accessToken="token" stores={[store]} scope="member" initialStoreId={store.id} {...overrides} />)
}

beforeEach(() => {
  vi.mocked(fetchCategories).mockReset().mockResolvedValue({ categories })
  vi.mocked(fetchProducts).mockReset().mockResolvedValue({ products })
  vi.mocked(createCategory).mockReset()
  vi.mocked(updateCategory).mockReset()
  vi.mocked(archiveCategory).mockReset()
  vi.mocked(createProduct).mockReset()
  vi.mocked(updateProduct).mockReset()
  vi.mocked(archiveProduct).mockReset()
  vi.mocked(uploadProductImage).mockReset()
  vi.mocked(removeProductImage).mockReset()
})

describe('StoreCatalogManagement', () => {
  it('loads store-scoped product and category data, formats Córdoba prices, and filters products', async () => {
    const user = userEvent.setup()
    renderCatalog()

    expect(await screen.findByText('C$ 12.50')).toBeInTheDocument()
    expect(screen.getByText('C$ 20.00')).toBeInTheDocument()
    expect(screen.getByText('Temporarily unavailable')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(fetchCategories).toHaveBeenCalledWith('token', 8, 'member')
    expect(fetchProducts).toHaveBeenCalledWith('token', 8, 'member')

    await user.type(screen.getByRole('textbox', { name: 'Search products' }), 'arroz')
    expect(screen.getByText('Arroz')).toBeInTheDocument()
    expect(screen.queryByText('Gaseosa')).not.toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Search products' }))
    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(screen.getByRole('option', { name: 'Granos (archived)' }))
    expect(screen.getByText('Arroz')).toBeInTheDocument()
    expect(screen.queryByText('Gaseosa')).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(screen.getByRole('option', { name: 'All categories' }))
    await user.click(screen.getByRole('combobox', { name: 'Availability' }))
    await user.click(screen.getByRole('option', { name: 'Temporarily unavailable' }))
    expect(screen.getByText('Arroz')).toBeInTheDocument()
    expect(screen.queryByText('Gaseosa')).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Availability' }))
    await user.click(screen.getByRole('option', { name: 'Any availability' }))
    await user.click(screen.getByRole('combobox', { name: 'Listing' }))
    await user.click(screen.getByRole('option', { name: 'Archived' }))
    expect(screen.getByText('Frijoles')).toBeInTheDocument()
    expect(screen.queryByText('Gaseosa')).not.toBeInTheDocument()
  })

  it('creates a product with a decimal string price and supported category/unit fields', async () => {
    const user = userEvent.setup()
    const created = { ...products[0], id: 20, name: 'Queso', price: '35.25', unit: 'libra' as const }
    vi.mocked(createProduct).mockResolvedValue({ product: created })
    renderCatalog()

    await user.click(await screen.findByRole('button', { name: 'Add product' }))
    await user.type(screen.getByRole('textbox', { name: 'Product name' }), 'Queso')
    await user.type(screen.getByRole('spinbutton', { name: /price/i }), '35.25')
    await user.click(screen.getByRole('combobox', { name: 'Unit' }))
    await user.click(screen.getByRole('option', { name: 'Pound' }))
    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(screen.getByRole('option', { name: 'Bebidas' }))
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledWith('token', 8, {
      name: 'Queso', description: '', price: '35.25', unit: 'libra', category_id: 2, available: true, active: true,
    }))
    expect(await screen.findByText('C$ 35.25')).toBeInTheDocument()
  })

  it('keeps product form open and shows field and general errors after a rejected request', async () => {
    const user = userEvent.setup()
    vi.mocked(createProduct).mockRejectedValue(new Error('Price must be greater than or equal to 0'))
    renderCatalog()

    await user.click(await screen.findByRole('button', { name: 'Add product' }))
    await user.type(screen.getByRole('textbox', { name: 'Product name' }), 'Milk')
    await user.type(screen.getByRole('spinbutton', { name: /price/i }), '1.23')
    const selectedImage = new File(['valid image'], 'milk.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Choose product photo'), selectedImage)
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Price must be greater than or equal to 0')
    expect(screen.getByRole('spinbutton', { name: /price/i })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue('Milk')
    expect(screen.getByRole('img', { name: 'Selected product image preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save product' })).toBeInTheDocument()
  })

  it('creates the product before uploading its selected image', async () => {
    const user = userEvent.setup()
    const created = { ...products[0], id: 41, name: 'Queso', image: { present: false, thumbnail_path: null } }
    vi.mocked(createProduct).mockResolvedValue({ product: created })
    vi.mocked(uploadProductImage).mockResolvedValue({ product: { id: 41, image: { present: true, thumbnail_path: '/api/v1/stores/8/products/41/image' } } })
    renderCatalog()

    await user.click(await screen.findByRole('button', { name: 'Add product' }))
    await user.type(screen.getByRole('textbox', { name: 'Product name' }), 'Queso')
    await user.type(screen.getByRole('spinbutton', { name: /price/i }), '35.00')
    const file = new File(['image bytes'], 'queso.webp', { type: 'image/webp' })
    await user.upload(screen.getByLabelText('Choose product photo'), file)
    expect(screen.getByRole('img', { name: 'Selected product image preview' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledOnce())
    await waitFor(() => expect(uploadProductImage).toHaveBeenCalledWith('token', 8, 41, file))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps a saved product and selected image available to retry when the upload fails', async () => {
    const user = userEvent.setup()
    const created = { ...products[0], id: 42, name: 'Milk', image: { present: false, thumbnail_path: null } }
    vi.mocked(createProduct).mockResolvedValue({ product: created })
    vi.mocked(updateProduct).mockResolvedValue({ product: created })
    vi.mocked(uploadProductImage).mockRejectedValueOnce(new Error('Upload unavailable')).mockResolvedValueOnce({ product: { id: 42, image: { present: true, thumbnail_path: '/api/v1/stores/8/products/42/image' } } })
    renderCatalog()

    await user.click(await screen.findByRole('button', { name: 'Add product' }))
    await user.type(screen.getByRole('textbox', { name: 'Product name' }), 'Milk')
    await user.type(screen.getByRole('spinbutton', { name: /price/i }), '1.50')
    const file = new File(['image bytes'], 'milk.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Choose product photo'), file)
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    expect(await screen.findByText('Upload unavailable')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue('Milk')
    expect(screen.getByRole('img', { name: 'Selected product image preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save product' })).toBeInTheDocument()
    expect(archiveProduct).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save product' }))
    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith('token', 8, 42, expect.any(Object)))
    await waitFor(() => expect(uploadProductImage).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(createProduct).toHaveBeenCalledOnce()
  })

  it('removes an existing image only after the product fields save successfully', async () => {
    const user = userEvent.setup()
    const withImage = { ...products[0], image: { present: true, thumbnail_path: '/api/v1/stores/8/products/10/image' } }
    vi.mocked(fetchProducts).mockResolvedValue({ products: [withImage] })
    vi.mocked(updateProduct).mockResolvedValue({ product: { ...withImage, description: 'Updated' } })
    vi.mocked(removeProductImage).mockResolvedValue({ product: { id: 10, image: { present: false, thumbnail_path: null } } })
    renderCatalog()

    await user.click(await screen.findByRole('button', { name: 'Edit Gaseosa' }))
    await user.click(screen.getByRole('button', { name: 'Remove image' }))
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    await waitFor(() => expect(updateProduct).toHaveBeenCalled())
    await waitFor(() => expect(removeProductImage).toHaveBeenCalledWith('token', 8, 10))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('updates product price and availability then confirms archive and supports reactivation', async () => {
    const user = userEvent.setup()
    vi.mocked(updateProduct).mockImplementation(async (_token, _storeId, id, changes) => ({ product: { ...products.find((item) => item.id === id)!, ...changes } as CatalogProduct }))
    vi.mocked(archiveProduct).mockResolvedValue({ product: { ...products[0], active: false } })
    renderCatalog()

    await user.click(await screen.findByRole('button', { name: 'Mark unavailable' }))
    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith('token', 8, 10, { available: false }))
    await user.click(screen.getByRole('button', { name: 'Edit Gaseosa' }))
    const priceField = screen.getByRole('spinbutton', { name: /price/i })
    await user.clear(priceField)
    await user.type(priceField, '13.75')
    await user.click(screen.getByRole('button', { name: 'Save product' }))
    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith('token', 8, 10, expect.objectContaining({ price: '13.75' })))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit product' })).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Archive Gaseosa' }))
    expect(screen.getByRole('dialog', { name: 'Archive product?' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(archiveProduct).toHaveBeenCalledWith('token', 8, 10))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findAllByText('Archived')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Reactivate Gaseosa' }))
    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith('token', 8, 10, { active: true }))
  })

  it('creates, edits, archives, and reactivates categories while retaining archived rows', async () => {
    const user = userEvent.setup()
    vi.mocked(createCategory).mockResolvedValue({ category: { ...categories[0], id: 4, name: 'Lácteos' } })
    vi.mocked(updateCategory).mockImplementation(async (_token, _storeId, id, changes) => ({ category: { ...categories.find((item) => item.id === id)!, ...changes } as CatalogCategory }))
    vi.mocked(archiveCategory).mockResolvedValue({ category: { ...categories[0], active: false } })
    renderCatalog()

    await user.click(await screen.findByRole('tab', { name: /categories/i }))
    await user.click(screen.getByRole('button', { name: 'Add category' }))
    await user.type(screen.getByRole('textbox', { name: 'Category name' }), 'Lácteos')
    await user.click(screen.getByRole('button', { name: 'Save category' }))
    await waitFor(() => expect(createCategory).toHaveBeenCalledWith('token', 8, { name: 'Lácteos' }))
    expect(await screen.findByText('Lácteos')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add category' })).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Edit Bebidas' }))
    const input = screen.getByRole('textbox', { name: 'Category name' })
    await user.clear(input)
    await user.type(input, 'Refrescos')
    await user.click(screen.getByRole('button', { name: 'Save category' }))
    await waitFor(() => expect(updateCategory).toHaveBeenCalledWith('token', 8, 2, { name: 'Refrescos' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit category' })).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Archive Refrescos' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Archive category?' })).getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(archiveCategory).toHaveBeenCalledWith('token', 8, 2))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findAllByText('Archived')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Reactivate Granos' }))
    await waitFor(() => expect(updateCategory).toHaveBeenCalledWith('token', 8, 3, { active: true }))
  })

  it('uses platform read-only endpoints without showing management controls for nonmembers', async () => {
    const adminVisibleStore = { ...store, membership: undefined }
    renderCatalog({ stores: [adminVisibleStore], scope: 'platform', platformStoreId: store.id, onBack: vi.fn() })

    expect(await screen.findByText(/read-only platform view/i)).toBeInTheDocument()
    expect(fetchCategories).toHaveBeenCalledWith('token', 8, 'platform')
    expect(fetchProducts).toHaveBeenCalledWith('token', 8, 'platform')
    expect(screen.queryByRole('button', { name: 'Add product' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: /categories/i }))
    expect(screen.queryByRole('button', { name: 'Add category' })).not.toBeInTheDocument()
  })

  it('renders responsive card controls and retries catalog failures', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchProducts).mockRejectedValueOnce(new Error('Unavailable'))
    renderCatalog()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load this store's catalog\.: unavailable/i)
    vi.mocked(fetchProducts).mockResolvedValueOnce({ products })
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Gaseosa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add product' })).toBeInTheDocument()
  })

  it('shows a useful empty state on a narrow viewport', async () => {
    const original = window.matchMedia
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({
      matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })) })
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })
    vi.mocked(fetchProducts).mockResolvedValue({ products: [] })
    renderCatalog()

    expect(await screen.findByText('No products yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add product' })).toBeEnabled()
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: original })
  })
})
