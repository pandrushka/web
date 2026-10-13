import { Box, Stack, Typography } from '@mui/material'

type BrandLogoProps = {
  compact?: boolean
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: compact ? 34 : 40,
          height: compact ? 34 : 40,
          borderRadius: '999px',
          border: '1.5px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'grid',
          placeItems: 'center',
          boxShadow: 2,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            fontSize: compact ? 36 : 42,
            lineHeight: 1,
            color: 'text.primary',
            transform: 'translateY(-1px)',
          }}
        >
          f
        </Typography>
      </Box>
      <Typography
        component="span"
        sx={{
          fontSize: compact ? 42 : 48,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'text.primary',
          lineHeight: 1,
          textTransform: 'lowercase',
        }}
      >
        forme
      </Typography>
    </Stack>
  )
}
