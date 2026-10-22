import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { AppBar, Avatar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import type { User } from '../types/auth'
import { BrandHeader } from './BrandHeader'
import { useAppTranslation } from '../i18n/useAppTranslation'
import { isPlatformAdmin } from '../utils/auth'

type AppHeaderProps = {
  user: User
  onMenuClick: () => void
  onLogout: () => void
}

export function AppHeader({ user, onMenuClick, onLogout }: AppHeaderProps) {
  const { t } = useAppTranslation('dashboard')
  const roleLabel = isPlatformAdmin(user)
    ? t('roles.superAdmin')
    : user.role === 'admin' ? t('roles.legacyAdmin') : t('roles.customer')
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ minHeight: 72, gap: 2 }}>
        <Tooltip title={t('nav.open')}>
          <IconButton aria-label={t('nav.open')} onClick={onMenuClick}>
            <MenuOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1 }}>
          <BrandHeader />
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 700 }}>
            {user.email.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>{user.email}</Typography>
            <Typography variant="caption" color="text.secondary">
              {roleLabel}
            </Typography>
          </Box>
          <Tooltip title={t('actions.logOut', { ns: 'common' })}>
            <IconButton aria-label={t('actions.logOut', { ns: 'common' })} onClick={onLogout}>
              <LogoutOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
