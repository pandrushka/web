import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'
import i18n from '../i18n'

describe('LandingPage branding', () => {
  it('shows the responsive Tu Pulpería logo and customer-focused introduction in Spanish by default', async () => {
    await i18n.changeLanguage('es')
    render(<LandingPage />)

    expect(screen.getByRole('img', { name: 'Tu Pulpería' })).toHaveAttribute('src', '/branding/tu-pulperia-logo-tagline.png')
    expect(screen.getByRole('heading', { name: /compra lo que necesitas/i })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('supports the English introduction', async () => {
    await i18n.changeLanguage('en')
    render(<LandingPage />)

    expect(screen.getByRole('heading', { name: /shop for everyday essentials/i })).toBeInTheDocument()
  })
})
