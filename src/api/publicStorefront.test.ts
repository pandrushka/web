import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPublicCategories, fetchPublicProduct, fetchPublicProductImage, fetchPublicProducts, fetchPublicStore, fetchPublicStores } from './publicStorefront'
import i18n from '../i18n'

afterEach(async () => {
  vi.unstubAllGlobals()
  await i18n.changeLanguage('es')
})

describe('public storefront API', () => {
  it('uses anonymous public endpoints and the Rails response paths', async () => {
    await i18n.changeLanguage('es')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ store: { name: 'Pulpería Estrada' } }), blob: async () => new Blob(['image']) })
    vi.stubGlobal('fetch', fetchMock)

    await fetchPublicStore('pulperia-estrada')
    await fetchPublicCategories('pulperia-estrada')
    await fetchPublicProducts('pulperia-estrada', 2, 24)
    await fetchPublicProduct('pulperia-estrada', 4)
    await fetchPublicStores({ q: 'León', city: 'Masaya', page: 2, perPage: 24 })
    await fetchPublicProductImage('/api/v1/public/stores/pulperia-estrada/products/4/image')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada',
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada/categories',
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada/products?page=2&per_page=24',
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada/products/4',
      'http://localhost:3000/api/v1/public/stores?q=Le%C3%B3n&city=Masaya&page=2&per_page=24',
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada/products/4/image',
    ])
    expect(fetchMock.mock.calls.map(([, init]) => init?.headers)).toEqual(Array(6).fill({ 'Accept-Language': 'es' }))
    expect(fetchMock.mock.calls.every(([, init]) => !('Authorization' in (init?.headers ?? {})))).toBe(true)
  })

  it('uses the current English language for public data and image requests', async () => {
    await i18n.changeLanguage('en')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), blob: async () => new Blob(['image']) })
    vi.stubGlobal('fetch', fetchMock)

    await fetchPublicStore('language-check')
    await fetchPublicProductImage('/api/v1/public/stores/language-check/products/1/image')

    expect(fetchMock.mock.calls.map(([, init]) => init.headers['Accept-Language'])).toEqual(['en', 'en'])
    expect(fetchMock.mock.calls.every(([, init]) => !('Authorization' in init.headers))).toBe(true)
  })

  it('preserves the API status for customer-friendly not-found handling', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Store not found' }) }))

    await expect(fetchPublicStore('hidden-shop')).rejects.toMatchObject({ message: 'Store not found', status: 404 })
  })

  it('coalesces duplicate public image requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) })
    vi.stubGlobal('fetch', fetchMock)
    const path = '/api/v1/public/stores/cache-check/products/1/image'

    const [first, second] = await Promise.all([fetchPublicProductImage(path), fetchPublicProductImage(path)])

    expect(first).toBe(second)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('sends server-side catalog filters and keeps the public detail response contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ product: { id: 4 } }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchPublicProducts('local-shop', 1, 24, { q: 'rice', categoryId: 3 })
    await fetchPublicProduct('local-shop', 4)
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/v1/public/stores/local-shop/products?page=1&per_page=24&q=rice&category_id=3')
    await expect(fetchPublicProduct('local-shop', 4)).resolves.toEqual({ product: { id: 4 } })
  })
})
