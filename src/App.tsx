import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Container, Stack } from '@mui/material'
import { login, refreshAuth, register } from './api/auth'
import {
  createAdminQuestion,
  fetchAdminQuestions,
  fetchQuestions,
  submitAnswers,
  updateAdminQuestion,
} from './api/onboarding'
import { AppDrawer } from './components/AppDrawer'
import { AppHeader } from './components/AppHeader'
import { AdminQuestionPanel } from './components/AdminQuestionPanel'
import { AuthCard } from './components/AuthCard'
import { DashboardPanel } from './components/DashboardPanel'
import { LandingPage } from './components/LandingPage'
import { QuestionnairePanel } from './components/QuestionnairePanel'
import type { AuthMode, User } from './types/auth'
import type { AppView } from './types/navigation'
import type { AnswerValue, NewQuestionPayload, Question } from './types/onboarding'
import { clearAuthSession, loadAuthSession, saveAuthSession } from './utils/authSession'
import { isSuperAdmin } from './utils/auth'
import { defaultAnswers, hasAnswer } from './utils/onboarding'

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [activeView, setActiveView] = useState<AppView>('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [adminQuestions, setAdminQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({})
  const [loading, setLoading] = useState(false)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isRegister = mode === 'register'
  const userIsSuperAdmin = Boolean(user && isSuperAdmin(user))
  const canSubmitAnswers = useMemo(
    () => questions.length > 0 && questions.every((question) => hasAnswer(question, answers[question.id])),
    [answers, questions],
  )

  useEffect(() => {
    if (!user) return undefined

    window.history.pushState({ appShell: 'dashboard' }, '', window.location.href)

    function handlePopState() {
      window.history.pushState({ appShell: 'dashboard' }, '', window.location.href)
      setActiveView('dashboard')
      setDrawerOpen(false)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [user])

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const session = loadAuthSession()

      if (!session) {
        if (!cancelled) setBootstrapping(false)
        return
      }

      try {
        const refreshed = await refreshAuth(session.refresh_token)

        if (cancelled) return

        const nextSession = {
          ...session,
          access_token: refreshed.access_token,
        }

        setUser(session.user)
        setAccessToken(refreshed.access_token)
        setActiveView('dashboard')
        saveAuthSession(nextSession)
        await loadQuestions(refreshed.access_token)

        if (isSuperAdmin(session.user)) {
          await loadAdminQuestions(refreshed.access_token)
        } else {
          setAdminQuestions([])
        }
      } catch {
        clearAuthSession()
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const auth = isRegister ? await register(email, password) : await login(email, password)

      setUser(auth.user)
      setAccessToken(auth.access_token)
      saveAuthSession(auth)
      setSuccess(isRegister ? 'Account created. Answer your first questions below.' : 'Signed in.')
      setActiveView('dashboard')
      await loadQuestions(auth.access_token)

      if (isSuperAdmin(auth.user)) {
        await loadAdminQuestions(auth.access_token)
      } else {
        setAdminQuestions([])
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Could not authenticate')
    } finally {
      setLoading(false)
    }
  }

  async function loadQuestions(token: string) {
    setQuestionsLoading(true)
    setError(null)

    try {
      const response = await fetchQuestions(token)

      setQuestions(response.questions)
      setAnswers(defaultAnswers(response.questions))
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : 'Could not load questions')
    } finally {
      setQuestionsLoading(false)
    }
  }

  async function loadAdminQuestions(token: string) {
    setAdminLoading(true)
    setError(null)

    try {
      const response = await fetchAdminQuestions(token)

      setAdminQuestions(response.questions)
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : 'Could not load admin questions')
    } finally {
      setAdminLoading(false)
    }
  }

  async function handleSubmitAnswers() {
    if (!accessToken) return

    setError(null)
    setSuccess(null)
    setSubmitLoading(true)

    try {
      await submitAnswers(accessToken, questions, answers)
      setSuccess('Answers saved.')
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : 'Could not save answers')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleToggleQuestion(question: Question, active: boolean) {
    if (!accessToken) return

    setError(null)
    setSuccess(null)
    setAdminLoading(true)

    try {
      const response = await updateAdminQuestion(accessToken, question.id, { active })

      setAdminQuestions((current) =>
        current.map((currentQuestion) => (currentQuestion.id === question.id ? response.question : currentQuestion)),
      )
      await loadQuestions(accessToken)
      setSuccess(active ? 'Question activated.' : 'Question hidden.')
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Could not update question')
    } finally {
      setAdminLoading(false)
    }
  }

  async function handleCreateQuestion(payload: NewQuestionPayload) {
    if (!accessToken) return

    setError(null)
    setSuccess(null)
    setAdminLoading(true)

    try {
      await createAdminQuestion(accessToken, payload)
      await Promise.all([loadAdminQuestions(accessToken), loadQuestions(accessToken)])
      setSuccess('Question added.')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create question')
    } finally {
      setAdminLoading(false)
    }
  }

  function handleNavigate(view: AppView) {
    if (view === 'edit_questionnaire' && !userIsSuperAdmin) {
      setError('Only super admins can edit the questionnaire.')
      return
    }

    setError(null)
    setSuccess(null)
    setActiveView(view)
  }

  function handleLogout() {
    setUser(null)
    setAccessToken(null)
    setQuestions([])
    setAdminQuestions([])
    setAnswers({})
    setEmail('')
    setPassword('')
    setMode('login')
    setActiveView('dashboard')
    setDrawerOpen(false)
    setError(null)
    setSuccess(null)
    clearAuthSession()
  }

  if (bootstrapping) {
    return (
      <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <LandingPage onStartJourney={() => setMode('register')} onHaveAccount={() => setMode('login')} />
          </Stack>
        </Container>
      </Box>
    )
  }

  return !user ? (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4} sx={{ alignItems: 'center' }}>
          <LandingPage onStartJourney={() => setMode('register')} onHaveAccount={() => setMode('login')} />
          <AuthCard
            mode={mode}
            email={email}
            password={password}
            loading={loading}
            error={error}
            success={success}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onModeChange={setMode}
            onSubmit={handleAuth}
          />
        </Stack>
      </Container>
    </Box>
  ) : (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <AppHeader user={user} onMenuClick={() => setDrawerOpen(true)} onLogout={handleLogout} />
      <AppDrawer
        open={drawerOpen}
        activeView={activeView}
        canEditQuestions={userIsSuperAdmin}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleNavigate}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          {activeView === 'dashboard' && (
            <DashboardPanel
              user={user}
              questionCount={questions.length}
              canEditQuestions={userIsSuperAdmin}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'questionnaire' && (
            <QuestionnairePanel
              questions={questions}
              answers={answers}
              questionsLoading={questionsLoading}
              submitLoading={submitLoading}
              canSubmitAnswers={canSubmitAnswers}
              onAnswerChange={(questionId, value) => setAnswers((current) => ({ ...current, [questionId]: value }))}
              onSubmitAnswers={handleSubmitAnswers}
            />
          )}

          {activeView === 'edit_questionnaire' && userIsSuperAdmin && (
            <AdminQuestionPanel
              questions={adminQuestions}
              loading={adminLoading}
              onToggleQuestion={handleToggleQuestion}
              onCreateQuestion={handleCreateQuestion}
            />
          )}
        </Stack>
      </Container>
    </Box>
  )
}

export default App
