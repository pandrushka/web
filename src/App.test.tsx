import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AuthResponse } from './types/auth'
import type { QuestionsResponse } from './types/onboarding'

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  refreshAuth: vi.fn(),
}))

const onboardingApi = vi.hoisted(() => ({
  fetchQuestions: vi.fn(),
  fetchAdminQuestions: vi.fn(),
  submitAnswers: vi.fn(),
  createAdminQuestion: vi.fn(),
  updateAdminQuestion: vi.fn(),
}))

vi.mock('./api/auth', () => authApi)
vi.mock('./api/onboarding', () => onboardingApi)

const userAuthResponse: AuthResponse = {
  user: {
    id: 1,
    email: 'andrey@example.com',
    role: 'member',
  },
  access_token: 'access-token-1',
  refresh_token: 'refresh-token-1',
}

const questionsResponse: QuestionsResponse = {
  questions: [
    {
      id: 1,
      prompt: 'How long have you been single?',
      question_type: 'text',
      active: true,
      position: 1,
      options: [],
    },
  ],
}

beforeEach(() => {
  authApi.login.mockReset()
  authApi.register.mockReset()
  authApi.refreshAuth.mockReset()
  onboardingApi.fetchQuestions.mockReset()
  onboardingApi.fetchAdminQuestions.mockReset()
  onboardingApi.submitAnswers.mockReset()
  onboardingApi.createAdminQuestion.mockReset()
  onboardingApi.updateAdminQuestion.mockReset()
})

describe('App auth shell', () => {
  it('logs in, stores the session, and shows the dashboard', async () => {
    authApi.login.mockResolvedValue(userAuthResponse)
    onboardingApi.fetchQuestions.mockResolvedValue(questionsResponse)

    const user = userEvent.setup()

    render(<App />)

    await screen.findByLabelText(/email/i)
    await user.type(screen.getByLabelText(/email/i), 'andrey@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => expect(screen.getByText(/welcome back/i)).toBeInTheDocument())
    expect(authApi.login).toHaveBeenCalledWith('andrey@example.com', 'password123')
    expect(onboardingApi.fetchQuestions).toHaveBeenCalledWith('access-token-1')
    expect(JSON.parse(window.localStorage.getItem('forme.auth.session') ?? 'null')).toMatchObject({
      user: userAuthResponse.user,
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
    })
  })

  it('restores a saved session and redirects straight to the dashboard', async () => {
    window.localStorage.setItem('forme.auth.session', JSON.stringify(userAuthResponse))
    authApi.refreshAuth.mockResolvedValue({ access_token: 'refreshed-access-token' })
    onboardingApi.fetchQuestions.mockResolvedValue(questionsResponse)

    render(<App />)

    await waitFor(() => expect(screen.getByText(/welcome back/i)).toBeInTheDocument())
    expect(authApi.refreshAuth).toHaveBeenCalledWith('refresh-token-1')
    expect(onboardingApi.fetchQuestions).toHaveBeenCalledWith('refreshed-access-token')
  })
})
