import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearProductImageCache, fetchProductImage, productImageCacheSize, removeProductImage, uploadProductImage } from './productImages'

const fetchMock = vi.fn()
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  clearProductImageCache()
})

describe('product image API', () => {
  it('uploads multipart form data without overriding its boundary content type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ product: { id: 12, image: { present: true, thumbnail_path: '/api/v1/stores/4/products/12/image' } } }))
    vi.stubGlobal('fetch', fetchMock)
    const image = new File(['image'], 'drink.webp', { type: 'image/webp' })

    await uploadProductImage('jwt', 4, 12, image)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/v1/stores/4/products/12/image')
    expect(init.method).toBe('PUT')
    expect(init.headers).toEqual({ Authorization: 'Bearer jwt' })
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('image')).toBe(image)
  })

  it('deletes images using the member endpoint and returns presence metadata', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ product: { id: 12, image: { present: false, thumbnail_path: null } } }))
    vi.stubGlobal('fetch', fetchMock)

    await removeProductImage('jwt', 4, 12)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/stores/4/products/12/image', expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json' } }))
  })

  it('invalidates the cached thumbnail after a successful replacement', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new TextEncoder().encode('old'), { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ product: { id: 12, image: { present: true, thumbnail_path: '/api/v1/stores/4/products/12/image' } } }))
      .mockResolvedValueOnce(new Response(new TextEncoder().encode('new'), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const path = '/api/v1/stores/4/products/12/image'

    expect(await (await fetchProductImage(path, 'jwt', 'user-1')).text()).toBe('old')
    await uploadProductImage('jwt', 4, 12, new File(['new'], 'new.png', { type: 'image/png' }))
    expect(await (await fetchProductImage(path, 'jwt', 'user-1')).text()).toBe('new')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('authenticates thumbnail requests, refreshes after 401, and caches per account and endpoint', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(new TextEncoder().encode('webp'), { status: 200, headers: { 'Content-Type': 'image/webp' } }))
      .mockResolvedValueOnce(new Response(new TextEncoder().encode('account 2'), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const refresh = vi.fn().mockResolvedValue('fresh-jwt')
    const path = '/api/v1/admin/stores/4/products/12/image'

    const [first, second] = await Promise.all([
      fetchProductImage(path, 'expired-jwt', 'user-8', refresh),
      fetchProductImage(path, 'expired-jwt', 'user-8', refresh),
    ])

    expect(first).toBe(second)
    expect(await first.text()).toBe('webp')
    expect(first.type).toBe('image/webp')
    expect(refresh).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer expired-jwt' })
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer fresh-jwt' })
    await fetchProductImage(path, 'another-jwt', 'user-9', refresh)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('bounds the private thumbnail cache and evicts least recently used entries', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(new TextEncoder().encode('webp'), { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)

    for (let index = 0; index < 49; index += 1) {
      await fetchProductImage(`/api/v1/stores/4/products/${index}/image`, 'jwt', 'user-1')
    }
    expect(productImageCacheSize()).toBe(48)
    await fetchProductImage('/api/v1/stores/4/products/0/image', 'jwt', 'user-1')
    expect(fetchMock).toHaveBeenCalledTimes(50)
  })

  it('clears cached private blobs when the account session changes', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(new TextEncoder().encode('webp'), { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    const path = '/api/v1/stores/4/products/2/image'

    await fetchProductImage(path, 'jwt-1', 'user-1')
    clearProductImageCache()
    await fetchProductImage(path, 'jwt-2', 'user-2')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
