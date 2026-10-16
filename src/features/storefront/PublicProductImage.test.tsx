import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPublicProductImage } from '../../api/publicStorefront'
import { PublicProductImage } from './PublicProductImage'

vi.mock('../../api/publicStorefront', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/publicStorefront')>()),
  fetchPublicProductImage: vi.fn(),
}))

afterEach(() => vi.unstubAllGlobals())

describe('PublicProductImage', () => {
  it('defers anonymous image fetching until near the viewport', async () => {
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
    vi.mocked(fetchPublicProductImage).mockResolvedValue(new Blob(['webp']))

    render(<PublicProductImage path="/api/v1/public/stores/tienda/products/8/image" alt="Water image" />)
    expect(screen.getByLabelText('Loading Water image')).toBeInTheDocument()
    expect(fetchPublicProductImage).not.toHaveBeenCalled()
    act(() => intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    await waitFor(() => expect(fetchPublicProductImage).toHaveBeenCalledOnce())
  })

  it('loads a public thumbnail and revokes its object URL when unmounted', async () => {
    const createObjectURL = vi.fn(() => 'blob:public-image')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.mocked(fetchPublicProductImage).mockResolvedValue(new Blob(['webp']))

    const { unmount } = render(<PublicProductImage path="/api/v1/public/stores/tienda/products/3/image" alt="Rice image" />)

    expect(await screen.findByRole('img', { name: 'Rice image' })).toHaveAttribute('src', 'blob:public-image')
    expect(fetchPublicProductImage).toHaveBeenCalledWith('/api/v1/public/stores/tienda/products/3/image')
    unmount()
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:public-image'))
  })

  it('uses the product placeholder when an image is absent or fails to load', async () => {
    vi.mocked(fetchPublicProductImage).mockRejectedValue(new Error('Image unavailable'))

    const { rerender } = render(<PublicProductImage path={null} alt="Beans image" />)
    expect(screen.getByRole('img', { name: 'Beans image placeholder' })).toBeInTheDocument()

    rerender(<PublicProductImage path="/private-public-image" alt="Beans image" />)
    expect(await screen.findByRole('img', { name: 'Beans image placeholder' })).toBeInTheDocument()
  })
})
