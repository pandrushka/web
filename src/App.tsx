import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  createTheme,
} from '@mui/material'

type AuthMode = 'login' | 'register'
type QuestionType = 'text' | 'number' | 'boolean' | 'single_select' | 'multi_select'
type AnswerValue = string | number | boolean | string[]

type User = {
  id: number
  email: string
  role: string
}

type AuthResponse = {
  user: User
  access_token: string
  refresh_token: string
}

type QuestionOption = {
  id: number
  label: string
  value: string
  position: number
}

type Question = {
  id: number
  prompt: string
  question_type: QuestionType
  position: number
  options: QuestionOption[]
}

type QuestionsResponse = {
  questions: Question[]
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f8f3ed',
      paper: '#fffaf5',
    },
    primary: {
      main: '#231817',
    },
    secondary: {
      main: '#9a5f3b',
    },
    text: {
      primary: '#241817',
      secondary: '#6d5f57',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    button: {
      fontWeight: 800,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
  },
})

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({})
  const [loading, setLoading] = useState(false)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isRegister = mode === 'register'
  const canSubmitAnswers = useMemo(
    () => questions.length > 0 && questions.every((question) => hasAnswer(question, answers[question.id])),
    [answers, questions],
  )

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const endpoint = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login'
      const auth = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      setUser(auth.user)
      setAccessToken(auth.access_token)
      setRefreshToken(auth.refresh_token)
      setSuccess(isRegister ? 'Account created. Answer your first questions below.' : 'Signed in.')
      await loadQuestions(auth.access_token)
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
      const response = await apiRequest<QuestionsResponse>('/api/v1/onboarding/questions', {
        headers: authorizationHeaders(token),
      })

      setQuestions(response.questions)
      setAnswers(defaultAnswers(response.questions))
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : 'Could not load questions')
    } finally {
      setQuestionsLoading(false)
    }
  }

  async function handleSubmitAnswers() {
    if (!accessToken) return

    setError(null)
    setSuccess(null)
    setSubmitLoading(true)

    try {
      await apiRequest('/api/v1/onboarding/answers', {
        method: 'POST',
        headers: authorizationHeaders(accessToken),
        body: JSON.stringify({
          answers: questions.map((question) => ({
            question_id: question.id,
            value: answers[question.id],
          })),
        }),
      })

      setSuccess('Answers saved.')
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : 'Could not save answers')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', py: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <BrandHeader />

            <Card elevation={0} sx={{ width: '100%', maxWidth: 560, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                <Stack spacing={3}>
                  <Stack spacing={1.5} sx={{ textAlign: 'center' }}>
                    <Chip
                      icon={<AutoAwesomeOutlinedIcon />}
                      label="Private dating clarity"
                      color="secondary"
                      variant="outlined"
                      sx={{ alignSelf: 'center', fontWeight: 800 }}
                    />
                    <Typography variant="h1" sx={{ fontSize: { xs: 36, sm: 48 }, lineHeight: 1 }}>
                      {isRegister ? 'Create your account' : 'Sign in'}
                    </Typography>
                    <Typography color="text.secondary">
                      {isRegister
                        ? 'After account creation, your live questionnaire will appear here.'
                        : 'Sign in to continue your questionnaire and dating pattern work.'}
                    </Typography>
                  </Stack>

                  {error && <Alert severity="error">{error}</Alert>}
                  {success && <Alert severity="success">{success}</Alert>}

                  <Box component="form" onSubmit={handleAuth} sx={{ display: 'grid', gap: 2 }}>
                    <TextField
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Password"
                      type="password"
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      fullWidth
                    />
                    <Button type="submit" variant="contained" size="large" disabled={loading}>
                      {loading ? <CircularProgress size={22} color="inherit" /> : isRegister ? 'Create account' : 'Sign in'}
                    </Button>
                  </Box>

                  <Button variant="text" onClick={() => setMode(isRegister ? 'login' : 'register')}>
                    {isRegister ? 'Already have an account? Sign in' : 'Need an account? Create one'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {(user || questionsLoading) && (
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

            {refreshToken && (
              <Typography variant="caption" color="text.secondary">
                Session ready for {user?.email}. Refresh token held in memory for this prototype.
              </Typography>
            )}
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

function BrandHeader() {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'background.paper',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <FavoriteBorderOutlinedIcon fontSize="small" />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        Matchcraft
      </Typography>
    </Stack>
  )
}

function QuestionnairePanel({
  questions,
  answers,
  questionsLoading,
  submitLoading,
  canSubmitAnswers,
  onAnswerChange,
  onSubmitAnswers,
}: {
  questions: Question[]
  answers: Record<number, AnswerValue>
  questionsLoading: boolean
  submitLoading: boolean
  canSubmitAnswers: boolean
  onAnswerChange: (questionId: number, value: AnswerValue) => void
  onSubmitAnswers: () => void
}) {
  return (
    <Card elevation={0} sx={{ width: '100%', maxWidth: 860, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography color="secondary" sx={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em' }}>
              CREATE ACCOUNT QUESTIONNAIRE
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 38 }, lineHeight: 1.05 }}>
              Answer the questions we are currently asking.
            </Typography>
          </Stack>

          {questionsLoading ? (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={2}>
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
              ))}
              <Button variant="contained" size="large" disabled={!canSubmitAnswers || submitLoading} onClick={onSubmitAnswers}>
                {submitLoading ? <CircularProgress size={22} color="inherit" /> : 'Save answers'}
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: Question
  value: AnswerValue
  onChange: (value: AnswerValue) => void
}) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography color="secondary" sx={{ fontWeight: 900, fontSize: 13 }}>
              Question {question.position}
            </Typography>
            <Chip size="small" label={formatQuestionType(question.question_type)} />
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {question.prompt}
          </Typography>
          <QuestionControl question={question} value={value} onChange={onChange} />
        </Stack>
      </CardContent>
    </Card>
  )
}

function QuestionControl({
  question,
  value,
  onChange,
}: {
  question: Question
  value: AnswerValue
  onChange: (value: AnswerValue) => void
}) {
  if (question.question_type === 'number') {
    return (
      <TextField
        label="Your answer"
        type="number"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        fullWidth
      />
    )
  }

  if (question.question_type === 'boolean') {
    return (
      <ToggleButtonGroup
        exclusive
        value={String(value)}
        onChange={(_, nextValue: string | null) => {
          if (nextValue) onChange(nextValue === 'true')
        }}
        aria-label="Boolean answer"
      >
        <ToggleButton value="true">Yes</ToggleButton>
        <ToggleButton value="false">No</ToggleButton>
      </ToggleButtonGroup>
    )
  }

  if (question.question_type === 'single_select') {
    return (
      <FormControl>
        <RadioGroup value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
          {question.options.map((option) => (
            <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
          ))}
        </RadioGroup>
      </FormControl>
    )
  }

  if (question.question_type === 'multi_select') {
    const selectedValues = Array.isArray(value) ? value : []

    return (
      <Stack>
        {question.options.map((option) => (
          <FormControlLabel
            key={option.value}
            control={
              <Checkbox
                checked={selectedValues.includes(option.value)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selectedValues, option.value])
                  } else {
                    onChange(selectedValues.filter((selectedValue) => selectedValue !== option.value))
                  }
                }}
              />
            }
            label={option.label}
          />
        ))}
      </Stack>
    )
  }

  return (
    <TextField
      label="Your answer"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      multiline
      minRows={4}
      fullWidth
    />
  )
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.error ?? errorBody.errors?.join(', ') ?? `Request failed with ${response.status}`)
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

function authorizationHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

function defaultAnswers(questions: Question[]) {
  return questions.reduce<Record<number, AnswerValue>>((memo, question) => {
    if (question.question_type === 'multi_select') {
      memo[question.id] = []
    } else if (question.question_type === 'boolean') {
      memo[question.id] = ''
    } else {
      memo[question.id] = ''
    }

    return memo
  }, {})
}

function hasAnswer(question: Question, value: AnswerValue | undefined) {
  if (question.question_type === 'boolean') return value === true || value === false
  if (question.question_type === 'multi_select') return Array.isArray(value) && value.length > 0
  if (question.question_type === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === 'string' && value.trim().length > 0
}

function formatQuestionType(questionType: QuestionType) {
  return questionType.replace('_', ' ')
}

export default App
