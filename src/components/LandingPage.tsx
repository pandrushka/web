import { Box, Stack, Typography } from '@mui/material'
import { TuPulperiaLogo } from './TuPulperiaLogo'
import { useAppTranslation } from '../i18n/useAppTranslation'

export function LandingPage() {
  const { t, i18n } = useAppTranslation('auth')
  return (
    <Box
      lang={i18n.resolvedLanguage}
      sx={{
        display: 'grid',
        gap: { xs: 3, md: 4 },
        justifyItems: 'center',
        alignItems: 'start',
      }}
    >
      <Stack spacing={3} sx={{ pt: { xs: 1, md: 3 }, maxWidth: 720, width: '100%', alignItems: 'center', textAlign: 'center' }}>
        <TuPulperiaLogo variant="tagline" size="large" sx={{ width: { xs: 260, sm: 320, md: 380 } }} />
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography component="h1" variant="h1" sx={{ fontSize: { xs: 30, sm: 38, md: 44 }, lineHeight: 1.15, maxWidth: 720 }}>
            {t('headline')}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 18 }, maxWidth: 560 }}>
            {t('introduction')}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
