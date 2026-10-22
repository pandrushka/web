import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import type { User } from '../types/auth'
import type { AppView } from '../types/navigation'
import { useAppTranslation } from '../i18n/useAppTranslation'

type DashboardPanelProps = {
  user: User
  questionCount: number
  canEditQuestions: boolean
  onNavigate: (view: AppView) => void
}

export function DashboardPanel({ user, questionCount, canEditQuestions, onNavigate }: DashboardPanelProps) {
  const { t } = useAppTranslation('legacy')
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography color="secondary" sx={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
          {t('dashboardEyebrow')}
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 52 }, lineHeight: 1 }}>
          {t('welcomeBack')}
        </Typography>
        <Typography color="text.secondary">
          {t('signedInAs', { email: user.email })}
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
                  <Typography variant="h6">
                    {t('title')}
                  </Typography>
                  <Typography color="text.secondary">
                    {t('questionCount', { count: questionCount })}
                  </Typography>
                </Stack>
                <Button variant="contained" onClick={() => onNavigate('questionnaire')}>
                  {t('openQuestionnaire')}
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
                    <Typography variant="h6">
                      {t('adminTools')}
                    </Typography>
                    <Typography color="text.secondary">
                      {t('adminToolsDescription')}
                    </Typography>
                  </Stack>
                  <Chip label={t('superAdminOnly')} color="secondary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                  <Button variant="outlined" onClick={() => onNavigate('edit_questionnaire')}>
                    {t('editQuestionnaire')}
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
