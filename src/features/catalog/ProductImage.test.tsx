import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProductImage } from '../../api/productImages'
import { ProductImage } from './ProductImage'

vi.mock('../../api/productImages', () => ({
  fetchProductImage: vi.fn(),
  clearProductImageCache: vi.fn(),
  onProductImageInvalidated: vi.fn(() => () => {}),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(fetchProductImage).mockReset()
})

describe('ProductImage', () => {
  it('defers its authenticated request until the image is near the viewport', async () => {
    let intersectionCallback: IntersectionObserverCallback | undefined
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback }
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = '240px'
      thresholds = [0]
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    vi.mocked(fetchProductImage).mockResolvedValue(new Blob(['webp']))

    render(<ProductImage path="/api/v1/stores/3/products/5/image" accessToken="jwt" cacheScope="user-1" alt="Rice image" />)
    expect(screen.getByLabelText('Loading Rice image')).toBeInTheDocument()
    expect(fetchProductImage).not.toHaveBeenCalled()
    act(() => intersectionCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(fetchProductImage).not.toHaveBeenCalled()
    act(() => intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))

    await waitFor(() => expect(fetchProductImage).toHaveBeenCalledOnce())
  })

  it('loads immediately when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.mocked(fetchProductImage).mockResolvedValue(new Blob(['webp']))

    render(<ProductImage path="/api/v1/stores/3/products/6/image" accessToken="jwt" cacheScope="user-1" alt="Beans image" />)

    await waitFor(() => expect(fetchProductImage).toHaveBeenCalledOnce())
  })

  it('loads an authenticated thumbnail and revokes its object URL on unmount', async () => {
    const blob = new Blob(['private thumbnail'], { type: 'image/webp' })
    vi.mocked(fetchProductImage).mockResolvedValue(blob)
    const createObjectURL = vi.fn().mockReturnValue('blob:private-image')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    const { unmount } = render(<ProductImage path="/api/v1/stores/3/products/5/image" accessToken="jwt" cacheScope="user-1" alt="Rice image" />)
    expect(await screen.findByRole('img', { name: 'Rice image' })).toHaveAttribute('src', 'blob:private-image')
    expect(fetchProductImage).toHaveBeenCalledWith('/api/v1/stores/3/products/5/image', 'jwt', 'user-1', undefined)

    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-image')
  })

  it('shows the placeholder for absent or failed private images and isolates account changes', async () => {
    vi.mocked(fetchProductImage).mockResolvedValueOnce(new Blob(['account 1']))
    let resolveSecondImage: ((image: Blob) => void) | undefined
    vi.mocked(fetchProductImage).mockImplementationOnce(() => new Promise((resolve) => { resolveSecondImage = resolve }))
    const createObjectURL = vi.fn().mockReturnValue('blob:account-image')
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
    const props = { path: '/api/v1/admin/stores/3/products/5/image', accessToken: 'admin-token', cacheScope: 'user-1', alt: 'Rice image' }
    const { rerender } = render(<ProductImage {...props} />)
    expect(await screen.findByRole('img', { name: 'Rice image' })).toBeInTheDocument()

    rerender(<ProductImage {...props} accessToken="customer-token" cacheScope="user-2" />)
    await waitFor(() => expect(fetchProductImage).toHaveBeenLastCalledWith(props.path, 'customer-token', 'user-2', undefined))
    expect(screen.queryByRole('img', { name: 'Rice image' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Loading Rice image')).toBeInTheDocument()
    resolveSecondImage?.(new Blob(['account 2']))
    expect(await screen.findByRole('img', { name: 'Rice image' })).toHaveAttribute('src', 'blob:account-image')

    rerender(<ProductImage {...props} path={null} />)
    expect(screen.getByRole('img', { name: 'Rice image placeholder' })).toBeInTheDocument()
  })
})
