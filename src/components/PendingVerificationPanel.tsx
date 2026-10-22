import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material'
import { BrandHeader } from './BrandHeader'
import { useAppTranslation } from '../i18n/useAppTranslation'

type PendingVerificationPanelProps = {
  loading: boolean
  notice: string | null
  onResend: () => void
  contextMessage?: string | null
}

export function PendingVerificationPanel({ loading, notice, onResend, contextMessage }: PendingVerificationPanelProps) {
  const { t } = useAppTranslation('auth')
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ minHeight: 72 }}>
          <BrandHeader />
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          minHeight: 'calc(100svh - 72px)',
          display: 'grid',
          placeItems: 'center',
          px: 3,
          py: 6,
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
          <Typography variant="h1" sx={{ fontSize: { xs: 34, md: 48 }, lineHeight: 1 }}>
            {t('verificationTitle')}
          </Typography>
          <Button variant="contained" size="large" onClick={onResend} disabled={loading}>
            {loading ? t('sending') : t('resendVerification')}
          </Button>
          {notice && (
            <Typography variant="body2" color="text.secondary">
              {notice}
            </Typography>
          )}
          {contextMessage && <Typography color="text.secondary">{contextMessage}</Typography>}
        </Stack>
      </Box>
    </Box>
  )
}
