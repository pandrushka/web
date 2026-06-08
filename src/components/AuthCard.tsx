import type { FormEvent } from 'react'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import type { AuthMode } from '../types/auth'

type AuthCardProps = {
  mode: AuthMode
  email: string
  password: string
  loading: boolean
  error: string | null
  success: string | null
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onModeChange: (mode: AuthMode) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AuthCard({
  mode,
  email,
  password,
  loading,
  error,
  success,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onSubmit,
}: AuthCardProps) {
  const isRegister = mode === 'register'

  return (
    <Card elevation={0} sx={{ width: '100%', maxWidth: 560, mx: 'auto', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Stack spacing={1.5} sx={{ textAlign: 'center' }}>
            <Chip
              icon={<AutoAwesomeOutlinedIcon />}
              label="for me. for my growth. for real love."
              color="secondary"
              variant="outlined"
              sx={{ alignSelf: 'center', fontWeight: 800 }}
            />
            <Typography variant="h1" sx={{ fontSize: { xs: 36, sm: 48 }, lineHeight: 1 }}>
              {isRegister ? 'Create your account' : 'Sign in'}
            </Typography>
            <Typography color="text.secondary">
              {isRegister
                ? 'Create your account to start your live questionnaire and keep the prompts evolving.'
                : 'Sign in to continue your questionnaire and dating pattern work.'}
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <Box component="form" onSubmit={onSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </Box>

          <Button variant="text" onClick={() => onModeChange(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
