import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPublicCategories, fetchPublicProductImage, fetchPublicProducts, fetchPublicStore } from './publicStorefront'

afterEach(() => vi.unstubAllGlobals())

describe('public storefront API', () => {
  it('uses anonymous public endpoints and the Rails response paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ store: { name: 'Pulpería Estrada' } }), blob: async () => new Blob(['image']) })
    vi.stubGlobal('fetch', fetchMock)

    await fetchPublicStore('pulperia-estrada')
    await fetchPublicCategories('pulperia-estrada')
    await fetchPublicProducts('pulperia-estrada', 2, 24)
    await fetchPublicProductImage('/api/v1/public/stores/pulperia-estrada/products/4/image')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada',
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada/categories',
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada/products?page=2&per_page=24',
      'http://localhost:3000/api/v1/public/stores/pulperia-estrada/products/4/image',
    ])
    expect(fetchMock.mock.calls.every(([, init]) => init === undefined)).toBe(true)
    expect(fetchMock.mock.calls.map(([, init]) => init?.headers)).toEqual([undefined, undefined, undefined, undefined])
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
})
