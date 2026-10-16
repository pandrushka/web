import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductDialog } from './CatalogDialogs'

vi.mock('./ProductImage', () => ({ ProductImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} /> }))

afterEach(() => vi.unstubAllGlobals())

describe('ProductDialog image selection', () => {
  it('offers camera and photo-library inputs, previews a selection, and revokes its temporary URL', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn().mockReturnValue('blob:selected-image')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const onSave = vi.fn()
    const { unmount } = render(<ProductDialog open product={null} categories={[]} saving={false} error={null} onClose={vi.fn()} onSave={onSave} />)
    const camera = screen.getByLabelText('Take product photo')
    const library = screen.getByLabelText('Choose product photo')
    expect(camera).toHaveAttribute('capture', 'environment')
    expect(camera).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(library).not.toHaveAttribute('capture')

    await user.upload(library, new File(['valid image'], 'beans.webp', { type: 'image/webp' }))
    expect(await screen.findByRole('img', { name: 'Selected product image preview' })).toHaveAttribute('src', 'blob:selected-image')
    expect(createObjectURL).toHaveBeenCalledOnce()
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:selected-image')
  })

  it('rejects unsupported and oversized files locally without passing them to save', async () => {
    const onSave = vi.fn()
    render(<ProductDialog open product={null} categories={[]} saving={false} error={null} onClose={vi.fn()} onSave={onSave} />)
    const input = screen.getByLabelText('Choose product photo')

    fireEvent.change(input, { target: { files: [new File(['text'], 'readme.txt', { type: 'text/plain' })] } })
    expect(await screen.findByText('Choose a JPEG, PNG, or WebP image.')).toBeInTheDocument()
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })] } })
    expect(await screen.findByText('Images must be 5 MiB or smaller.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
