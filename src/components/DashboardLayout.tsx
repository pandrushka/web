import type { ReactNode } from 'react'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import {
  AppBar, Avatar, Box, Chip, Divider, Drawer, FormControl, IconButton, InputLabel, List,
  ListItemButton, ListItemIcon, ListItemText, MenuItem, Select, Stack, Toolbar, Typography,
  Menu, useMediaQuery,
} from '@mui/material'
import { useId, useState } from 'react'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useTheme } from '@mui/material/styles'
import { dashboardRoleLabel, storeMembershipRoleLabel } from '../utils/roleLabels'

export type DashboardContext = 'platform' | 'store' | 'employee' | 'customer'
export type DashboardSection = 'dashboard' | 'invitations' | 'users' | 'platform_reports' | 'platform_settings' | 'products' | 'orders' | 'sales' | 'store_settings'
export type StoreRole = 'owner' | 'admin' | 'employee'

type NavItem = { id: DashboardSection; label: string; icon: ReactNode; comingSoon?: boolean }

type DashboardLayoutProps = {
  email: string
  role: string
  context: DashboardContext
  storeRole: StoreRole | null
  canSwitchContext: boolean
  isPlatformAdmin: boolean
  showPlatformCatalog?: boolean
  activeSection: DashboardSection
  onContextChange: (context: DashboardContext) => void
  onNavigate: (section: DashboardSection) => void
  onLogout: () => void
  children: ReactNode
}

export function DashboardLayout({ email, role, context, storeRole, canSwitchContext, isPlatformAdmin, showPlatformCatalog = false, activeSection, onContextChange, onNavigate, onLogout, children }: DashboardLayoutProps) {
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null)
  const accountMenuId = useId()
  const identityRole = dashboardRoleLabel(role, context, storeRole)
  const storeRoleLabel = storeMembershipRoleLabel(storeRole)

  const items: NavItem[] = [{
    id: 'dashboard',
    label: context === 'platform' ? 'Super Admin Dashboard' : context === 'store' ? `${storeRoleLabel ?? 'Store'} Dashboard` : context === 'employee' ? 'Employee Dashboard' : 'Customer Dashboard',
    icon: context === 'platform' ? <DashboardOutlinedIcon /> : <StorefrontOutlinedIcon />,
  }]
  if (context === 'platform' && isPlatformAdmin) {
    items.push(
      { id: 'invitations', label: 'Invitations', icon: <ConfirmationNumberOutlinedIcon /> },
      ...(showPlatformCatalog ? [{ id: 'products' as const, label: 'Products & Categories', icon: <Inventory2OutlinedIcon /> }] : []),
      { id: 'users', label: 'Users', icon: <PeopleOutlineOutlinedIcon />, comingSoon: true },
      { id: 'platform_reports', label: 'Platform Reports', icon: <AssessmentOutlinedIcon />, comingSoon: true },
      { id: 'platform_settings', label: 'Platform Settings', icon: <SettingsOutlinedIcon />, comingSoon: true },
    )
  } else if (context === 'store' && (storeRole === 'owner' || storeRole === 'admin')) {
    items.push(
      { id: 'products', label: 'Products', icon: <Inventory2OutlinedIcon /> },
      { id: 'orders', label: 'Orders', icon: <ShoppingBagOutlinedIcon />, comingSoon: true },
      { id: 'sales', label: 'Sales', icon: <AssessmentOutlinedIcon />, comingSoon: true },
      { id: 'store_settings', label: 'Store Settings', icon: <SettingsOutlinedIcon />, comingSoon: true },
    )
  }

  const handleContextChange = (event: SelectChangeEvent<DashboardContext>) => {
    onContextChange(event.target.value as DashboardContext)
    setMobileOpen(false)
  }

  const handleNavigate = (section: DashboardSection) => {
    onNavigate(section)
    setMobileOpen(false)
  }

  const sidebar = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      {canSwitchContext && (
        <FormControl fullWidth size="small" sx={{ my: 1 }}>
          <InputLabel id="dashboard-context-label">Context</InputLabel>
          <Select labelId="dashboard-context-label" id="dashboard-context" value={context} label="Context" onChange={handleContextChange}>
            {isPlatformAdmin && <MenuItem value="platform">Super Admin</MenuItem>}
            {storeRoleLabel && <MenuItem value={storeRole === 'employee' ? 'employee' : 'store'}>{storeRoleLabel}</MenuItem>}
          </Select>
        </FormControl>
      )}
      <Divider sx={{ mt: canSwitchContext ? 1 : 0 }} />
      <List id="dashboard-navigation" component="nav" aria-label="Main navigation" sx={{ display: 'grid', gap: 0.5, py: 2 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            selected={!item.comingSoon && activeSection === item.id}
            disabled={item.comingSoon}
            aria-current={!item.comingSoon && activeSection === item.id ? 'page' : undefined}
            onClick={() => handleNavigate(item.id)}
            sx={{ borderRadius: 2, minHeight: 48, '&.Mui-selected': { color: 'primary.main', bgcolor: 'primary.light' } }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
            {item.comingSoon && <Chip size="small" label="Coming soon" variant="outlined" />}
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', bgcolor: 'background.default' }}>
      {desktop ? (
        <Box component="aside" sx={{ width: 280, flexShrink: 0, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>{sidebar}</Box>
      ) : (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} slotProps={{ paper: { sx: { width: 296 } } }}>{sidebar}</Drawer>
      )}
      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky">
          <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, gap: 1.5 }}>
            {!desktop && <IconButton edge="start" color="inherit" aria-label="Open navigation" aria-controls="dashboard-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} sx={{ minWidth: 48, minHeight: 48 }}><MenuOutlinedIcon /></IconButton>}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.dark', flexShrink: 0 }}>
                <StorefrontOutlinedIcon aria-hidden="true" />
              </Box>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }} noWrap>Store Platform</Typography>
            </Stack>
            {desktop && <Box sx={{ minWidth: 0, textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{email}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none', letterSpacing: 0 }}>{identityRole}</Typography>
            </Box>}
            <IconButton
              color="inherit"
              aria-label={`Open account menu for ${email}`}
              aria-controls={accountAnchor ? accountMenuId : undefined}
              aria-haspopup="menu"
              aria-expanded={Boolean(accountAnchor)}
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              sx={{ minWidth: 48, minHeight: 48 }}
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.light', color: 'secondary.main' }}>{email.slice(0, 1).toUpperCase()}</Avatar>
            </IconButton>
            <Menu id={accountMenuId} anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)} slotProps={{ list: { 'aria-label': 'Account options' } }}>
              <Box sx={{ px: 2, py: 1, maxWidth: 280 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{email}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none', letterSpacing: 0 }}>{identityRole}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setAccountAnchor(null); onLogout() }} sx={{ minHeight: 48 }}>
                <ListItemIcon><LogoutOutlinedIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Log out</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3, lg: 4 } }}>{children}</Box>
      </Box>
    </Box>
  )
}
