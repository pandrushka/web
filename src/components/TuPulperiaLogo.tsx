import { Box, Stack, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

export type TuPulperiaLogoVariant = 'icon' | 'horizontal' | 'tagline'
export type TuPulperiaLogoBackground = 'light' | 'dark'

type TuPulperiaLogoProps = {
  variant?: TuPulperiaLogoVariant
  background?: TuPulperiaLogoBackground
  size?: 'small' | 'medium' | 'large'
  alt?: string
  sx?: SxProps<Theme>
}

const assetPaths = {
  icon: '/branding/tu-pulperia-icon.png',
  horizontal: '/branding/tu-pulperia-logo-light.png',
  tagline: '/branding/tu-pulperia-logo-tagline.png',
}

const widths = {
  horizontal: { small: 150, medium: 210, large: 280 },
  tagline: { small: 190, medium: 280, large: 380 },
}

const iconSizes = { small: 32, medium: 40, large: 52 }

/** Brand mark for light or dark surfaces, using the prepared production assets. */
export function TuPulperiaLogo({
  variant = 'horizontal',
  background = 'light',
  size = 'medium',
  alt = 'Tu Pulpería',
  sx,
}: TuPulperiaLogoProps) {
  if (background === 'dark' && variant !== 'icon') {
    return (
      <Stack
        direction="row"
        spacing={1.25}
        role="img"
        aria-label={alt}
        sx={[{ width: 'fit-content', maxWidth: '100%', alignItems: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        <Box
          component="img"
          src={assetPaths.icon}
          alt=""
          aria-hidden="true"
          sx={{ width: iconSizes[size], height: iconSizes[size], objectFit: 'contain', flexShrink: 0 }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="span" sx={{ display: 'block', color: 'common.white', fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
            Tu Pulpería
          </Typography>
          {variant === 'tagline' && (
            <Typography component="span" variant="caption" sx={{ display: 'block', color: 'grey.300', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              Tu tienda, más cerca
            </Typography>
          )}
        </Box>
      </Stack>
    )
  }

  const width = variant === 'icon' ? iconSizes[size] : widths[variant][size]

  return (
    <Box
      component="img"
      src={assetPaths[variant]}
      alt={alt}
      sx={[
        {
          display: 'block',
          width,
          maxWidth: '100%',
          height: 'auto',
          objectFit: 'contain',
          flexShrink: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}
