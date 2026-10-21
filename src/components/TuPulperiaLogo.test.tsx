import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TuPulperiaLogo } from './TuPulperiaLogo'

describe('TuPulperiaLogo', () => {
  it.each([
    ['icon', '/branding/tu-pulperia-icon.png'],
    ['horizontal', '/branding/tu-pulperia-logo-light.png'],
    ['tagline', '/branding/tu-pulperia-logo-tagline.png'],
  ] as const)('renders the %s production asset with accessible text', (variant, src) => {
    render(<TuPulperiaLogo variant={variant} size="small" />)
    const image = screen.getByRole('img', { name: 'Tu Pulpería' })
    expect(image).toHaveAttribute('src', src)
    expect(image).toHaveStyle({ maxWidth: '100%', height: 'auto', objectFit: 'contain' })
  })

  it('uses a transparent symbol and white text for dark surfaces instead of the opaque dark logo', () => {
    const { container } = render(<TuPulperiaLogo variant="tagline" background="dark" />)
    expect(screen.getByRole('img', { name: 'Tu Pulpería' })).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', '/branding/tu-pulperia-icon.png')
    expect(screen.getByText('Tu Pulpería')).toBeInTheDocument()
    expect(screen.getByText('Tu tienda, más cerca')).toBeInTheDocument()
  })

  it('allows a custom accessible label', () => {
    render(<TuPulperiaLogo variant="icon" alt="Tu Pulpería platform home" />)
    expect(screen.getByRole('img', { name: 'Tu Pulpería platform home' })).toBeInTheDocument()
  })
})
