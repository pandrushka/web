import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { AppBar, Avatar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import type { User } from '../types/auth'
import { BrandHeader } from './BrandHeader'

type AppHeaderProps = {
  user: User
  onMenuClick: () => void
  onLogout: () => void
}

export function AppHeader({ user, onMenuClick, onLogout }: AppHeaderProps) {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ minHeight: 72, gap: 2 }}>
        <Tooltip title="Open navigation">
          <IconButton aria-label="Open navigation" onClick={onMenuClick}>
            <MenuOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1 }}>
          <BrandHeader />
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 900 }}>
            {user.email.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>{user.email}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user.role.replace('_', ' ')}
            </Typography>
          </Box>
          <Tooltip title="Log out">
            <IconButton aria-label="Log out" onClick={onLogout}>
              <LogoutOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
