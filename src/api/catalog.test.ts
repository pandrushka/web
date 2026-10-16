import { afterEach, describe, expect, it, vi } from 'vitest'
import { archiveProduct, createCategory, createProduct, fetchCategories, fetchProducts, updateCategory, updateProduct } from './catalog'

const fetchMock = vi.fn()

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('catalog API contracts', () => {
  it('uses the member and platform read endpoints', async () => {
    fetchMock.mockResolvedValueOnce(response({ categories: [] }))
      .mockResolvedValueOnce(response({ products: [] }))
      .mockResolvedValueOnce(response({ categories: [] }))
      .mockResolvedValueOnce(response({ products: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchCategories('jwt', 7, 'member')
    await fetchProducts('jwt', 7, 'member')
    await fetchCategories('jwt', 7, 'platform')
    await fetchProducts('jwt', 7, 'platform')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3000/api/v1/stores/7/categories',
      'http://localhost:3000/api/v1/stores/7/products',
      'http://localhost:3000/api/v1/admin/stores/7/categories',
      'http://localhost:3000/api/v1/admin/stores/7/products',
    ])
  })

  it('uses the Rails nested body and methods for create, update, and archive', async () => {
    fetchMock.mockResolvedValueOnce(response({ category: { id: 3 } }, 201))
      .mockResolvedValueOnce(response({ category: { id: 3 } }))
      .mockResolvedValueOnce(response({ product: { id: 4 } }, 201))
      .mockResolvedValueOnce(response({ product: { id: 4 } }))
      .mockResolvedValueOnce(response({ product: { id: 4, active: false } }))
    vi.stubGlobal('fetch', fetchMock)

    await createCategory('jwt', 7, { name: 'Bebidas' })
    await updateCategory('jwt', 7, 3, { active: true })
    await createProduct('jwt', 7, { name: 'Arroz', description: '', price: '0.50', unit: 'libra', category_id: 3, available: true, active: true })
    await updateProduct('jwt', 7, 4, { price: '1.25' })
    await archiveProduct('jwt', 7, 4)

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method, init.body ? JSON.parse(init.body as string) : undefined])).toEqual([
      ['http://localhost:3000/api/v1/stores/7/categories', 'POST', { category: { name: 'Bebidas' } }],
      ['http://localhost:3000/api/v1/stores/7/categories/3', 'PATCH', { category: { active: true } }],
      ['http://localhost:3000/api/v1/stores/7/products', 'POST', { product: { name: 'Arroz', description: '', price: '0.50', unit: 'libra', category_id: 3, available: true, active: true } }],
      ['http://localhost:3000/api/v1/stores/7/products/4', 'PATCH', { product: { price: '1.25' } }],
      ['http://localhost:3000/api/v1/stores/7/products/4', 'DELETE', undefined],
    ])
  })
})
