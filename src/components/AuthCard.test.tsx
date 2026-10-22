import { useState } from 'react'
import type { FormEvent } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthCard } from './AuthCard'
import type { AuthMode } from '../types/auth'
import i18n from '../i18n'

function CustomerAuthCard({ onSubmit = vi.fn() }: { onSubmit?: (event: FormEvent<HTMLFormElement>) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [profile, setProfile] = useState({ first_name: '', last_name: '', phone_number: '' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return <AuthCard
    mode={mode}
    email={email}
    password={password}
    loading={false}
    error={null}
    success={null}
    turnstileSiteKey={null}
    turnstileToken={null}
    onEmailChange={setEmail}
    onPasswordChange={setPassword}
    onModeChange={setMode}
    onTurnstileTokenChange={vi.fn()}
    onSubmit={onSubmit}
    customerExperience
    registrationProfile={profile}
    onRegistrationProfileChange={setProfile}
  />
}

describe('customer authentication card', () => {
  it('shows accessible sign-in and registration tabs and switches to the customer registration fields', async () => {
    await i18n.changeLanguage('es')
    const user = userEvent.setup()
    render(<CustomerAuthCard />)

    expect(screen.getByRole('tab', { name: 'Iniciar sesión' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }))

    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/nombre/i)).toBeRequired()
    expect(screen.getByLabelText(/apellido/i)).toBeRequired()
    expect(screen.getByLabelText(/número de teléfono/i)).toBeRequired()
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeRequired()
    expect(screen.queryByRole('button', { name: /need an account|already have an account/i })).not.toBeInTheDocument()
  })

  it('supports English translation and validates password confirmation before submission', async () => {
    await i18n.changeLanguage('es')
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CustomerAuthCard onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Create account' }))
    await user.type(screen.getByLabelText(/first name/i), 'Ana')
    await user.type(screen.getByLabelText(/last name/i), 'López')
    await user.type(screen.getByLabelText(/phone number/i), '88881234')
    await user.type(screen.getByLabelText(/email address/i), 'ana@example.com')
    await user.type(screen.getAllByLabelText(/password/i)[0], 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
