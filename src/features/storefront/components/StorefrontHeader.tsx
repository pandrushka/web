import { Avatar, Box, Stack, Typography } from '@mui/material'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import type { StorefrontStore } from '../types'

export function StorefrontHeader({ store }: { store: StorefrontStore }) {
  return (
    <Box component="header" sx={{ bgcolor: 'primary.main', color: 'common.white', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 }, borderRadius: { xs: 0, sm: 3 } }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', maxWidth: 1100, mx: 'auto' }}>
        <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: 'common.white', color: 'primary.dark', fontWeight: 700, fontSize: '1.75rem' }}>
          {store.logo_initial || store.name.slice(0, 1).toUpperCase() || <StorefrontOutlinedIcon />}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{store.name}</Typography>
          <Typography variant="body1" sx={{ color: 'primary.contrastText', opacity: 0.9 }}>{store.city}</Typography>
        </Box>
      </Stack>
    </Box>
  )
}
