import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FlipCard } from './FlipCard'

describe('FlipCard', () => {
  it('shows the controlled front and hides the back until flipped', () => {
    const { rerender } = render(<FlipCard front={<p>Front face</p>} back={<p>Back face</p>} flipped={false} />)
    expect(screen.getByText('Front face').closest('[data-testid="flip-card-front"]')).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByText('Back face').closest('[data-testid="flip-card-back"]')).toHaveAttribute('aria-hidden', 'true')

    rerender(<FlipCard front={<p>Front face</p>} back={<p>Back face</p>} flipped />)
    expect(screen.getByText('Front face').closest('[data-testid="flip-card-front"]')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Back face').closest('[data-testid="flip-card-back"]')).toHaveAttribute('aria-hidden', 'false')
  })

  it('applies the controlled Y-axis rotation and default duration', () => {
    const { rerender } = render(<FlipCard front="Front" back="Back" flipped={false} />)
    const rotator = screen.getByTestId('flip-card-rotator')
    expect(rotator).toHaveStyle({ transform: 'rotateY(0deg)', transition: 'transform 500ms ease' })
    rerender(<FlipCard front="Front" back="Back" flipped duration={700} />)
    expect(rotator).toHaveStyle({ transform: 'rotateY(180deg)', transition: 'transform 700ms ease' })
  })

  it('removes the hidden face from focus and accessibility navigation', () => {
    render(<FlipCard front={<button>Front action</button>} back={<input aria-label="Back field" />} flipped />)
    const hiddenFront = screen.getByText('Front action').closest('[data-testid="flip-card-front"]')
    expect(hiddenFront).toHaveAttribute('aria-hidden', 'true')
    expect(hiddenFront).toHaveAttribute('inert')
    expect(screen.getByTestId('flip-card-back')).not.toHaveAttribute('inert')
  })

  it('disables motion when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })))
    render(<FlipCard front="Front" back="Back" flipped />)
    expect(screen.getByTestId('flip-card-rotator')).toHaveStyle({ transition: 'none' })
  })

  it('measures both faces, locks their shared size during a flip, then restores the active face size', () => {
    const original = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('data-measured-face') === 'front') return { width: 400, height: 240, top: 0, left: 0, right: 400, bottom: 240, x: 0, y: 0, toJSON: () => ({}) }
      if (this.getAttribute('data-measured-face') === 'back') return { width: 400, height: 480, top: 0, left: 0, right: 400, bottom: 480, x: 0, y: 0, toJSON: () => ({}) }
      return original.call(this)
    })
    const { rerender } = render(<FlipCard front={<div>Short face</div>} back={<div>{'Long content. '.repeat(100)}</div>} flipped={false} sx={{ width: { xs: '100%', sm: 480 } }} />)
    const sizer = screen.getByTestId('flip-card-sizer')
    expect(sizer).toHaveStyle({ height: '240px' })
    rerender(<FlipCard front={<div>Short face</div>} back={<div>{'Long content. '.repeat(100)}</div>} flipped sx={{ width: { xs: '100%', sm: 480 } }} />)
    expect(sizer).toHaveStyle({ height: '480px' })
    fireEvent.transitionEnd(screen.getByTestId('flip-card-rotator'), { propertyName: 'transform' })
    expect(sizer).toHaveStyle({ height: '480px' })
    expect(screen.getByTestId('flip-card-rotator')).toHaveStyle({ display: 'grid' })
    expect(screen.getByTestId('flip-card-front').className).toBeTruthy()
    expect(screen.getByTestId('flip-card-back').className).toBeTruthy()
    expect(screen.getByRole('group')).toBeInTheDocument()
  })
})
