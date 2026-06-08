import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import type { User } from '../types/auth'
import type { AppView } from '../types/navigation'

type DashboardPanelProps = {
  user: User
  questionCount: number
  canEditQuestions: boolean
  onNavigate: (view: AppView) => void
}

export function DashboardPanel({ user, questionCount, canEditQuestions, onNavigate }: DashboardPanelProps) {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography color="secondary" sx={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em' }}>
          DASHBOARD
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 52 }, lineHeight: 1 }}>
          Welcome back.
        </Typography>
        <Typography color="text.secondary">
          Signed in as {user.email}. Use the menu to move through the app.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: canEditQuestions ? 'repeat(2, minmax(0, 1fr))' : '1fr' },
        }}
      >
        <Box>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <QuizOutlinedIcon color="secondary" />
                <Stack spacing={0.5}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Questionnaire
                  </Typography>
                  <Typography color="text.secondary">
                    {questionCount} active {questionCount === 1 ? 'question is' : 'questions are'} ready.
                  </Typography>
                </Stack>
                <Button variant="contained" onClick={() => onNavigate('questionnaire')}>
                  Open questionnaire
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {canEditQuestions && (
          <Box>
            <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <AdminPanelSettingsOutlinedIcon color="secondary" />
                  <Stack spacing={0.5}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Super admin tools
                    </Typography>
                    <Typography color="text.secondary">
                      Add questions and turn prompts on or off for sign up.
                    </Typography>
                  </Stack>
                  <Chip label="Super admin only" color="secondary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                  <Button variant="outlined" onClick={() => onNavigate('edit_questionnaire')}>
                    Edit questionnaire
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Stack>
  )
}
