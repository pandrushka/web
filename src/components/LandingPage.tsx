import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import { Box, Button, Stack, Typography } from '@mui/material'
import { BrandLogo } from './BrandLogo'

type LandingPageProps = {
  onStartJourney: () => void
  onHaveAccount: () => void
}

export function LandingPage({ onStartJourney, onHaveAccount }: LandingPageProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 3, md: 4 },
        justifyItems: 'center',
        alignItems: 'start',
      }}
    >
      <Stack spacing={3} sx={{ pt: { xs: 1, md: 3 }, maxWidth: 720, width: '100%', alignItems: 'center', textAlign: 'center' }}>
        <BrandLogo />
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="secondary.main">
            relationship wellness
          </Typography>
          {/* <Typography variant="h1" sx={{ fontSize: { xs: 60, sm: 76, md: 96 }, lineHeight: 0.92 }}>
            forme
          </Typography> */}
          {/* <Typography variant="h3" sx={{ fontSize: { xs: 28, sm: 34, md: 40 }, lineHeight: 1.05 }}>
            For me. For my growth. For real love.
          </Typography> */}
          <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 18 }, maxWidth: 560 }}>
            A softer place to understand your patterns, answer the right questions, and move toward a relationship that
            fits the person you are becoming.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <Button variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />} onClick={onStartJourney}>
            Start My Journey
          </Button>
          <Button variant="text" onClick={onHaveAccount} sx={{ justifyContent: 'flex-start', px: 0 }}>
            I already have an account
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
