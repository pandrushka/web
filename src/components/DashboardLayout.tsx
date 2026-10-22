import type { ReactNode } from 'react'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
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
  AppBar, Avatar, Box, ButtonBase, Chip, Divider, Drawer, FormControl, IconButton, InputLabel, List,
  ListItemButton, ListItemIcon, ListItemText, MenuItem, Select, Toolbar, Typography,
  Menu, Tooltip, useMediaQuery,
} from '@mui/material'
import { useId, useState } from 'react'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useTheme } from '@mui/material/styles'
import { TuPulperiaLogo } from './TuPulperiaLogo'
import { useAppTranslation } from '../i18n/useAppTranslation'
import { LanguageToggle } from '../i18n/LanguageToggle'

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
  const { t } = useAppTranslation(['dashboard', 'common'])
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const sidebarCollapsed = desktop && desktopCollapsed
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null)
  const accountMenuId = useId()
  const storeRoleLabel = storeRole === 'owner' ? t('roles.owner') : storeRole === 'admin' ? t('roles.admin') : storeRole === 'employee' ? t('roles.employee') : null
  const identityRole = context === 'platform' && isPlatformAdmin ? t('roles.superAdmin') : storeRoleLabel ?? (role === 'admin' ? t('roles.legacyAdmin') : t('roles.customer'))
  const pageTitle = activeSection === 'dashboard'
    ? context === 'platform' ? t('titles.platform') : context === 'store' ? t('titles.store', { role: storeRoleLabel ?? t('roles.store') }) : context === 'employee' ? t('titles.employee') : t('titles.customer')
    : activeSection === 'products' && context === 'platform' ? t('titles.productsCategories')
      : ({
          invitations: t('titles.invitations'),
          users: t('titles.users'),
          platform_reports: t('titles.platformReports'),
          platform_settings: t('titles.platformSettings'),
          products: t('titles.products'),
          orders: t('titles.orders'),
          sales: t('titles.sales'),
          store_settings: t('titles.storeSettings'),
          dashboard: t('titles.dashboard'),
        } satisfies Record<DashboardSection, string>)[activeSection]

  const items: NavItem[] = [{
    id: 'dashboard',
    label: context === 'platform' ? t('titles.platform') : context === 'store' ? t('titles.store', { role: storeRoleLabel ?? t('roles.store') }) : context === 'employee' ? t('titles.employee') : t('titles.customer'),
    icon: context === 'platform' ? <DashboardOutlinedIcon /> : <StorefrontOutlinedIcon />,
  }]
  if (context === 'platform' && isPlatformAdmin) {
    items.push(
      { id: 'invitations', label: t('titles.invitations'), icon: <ConfirmationNumberOutlinedIcon /> },
      ...(showPlatformCatalog ? [{ id: 'products' as const, label: t('titles.productsCategories'), icon: <Inventory2OutlinedIcon /> }] : []),
      { id: 'users', label: t('titles.users'), icon: <PeopleOutlineOutlinedIcon />, comingSoon: true },
      { id: 'platform_reports', label: t('titles.platformReports'), icon: <AssessmentOutlinedIcon />, comingSoon: true },
      { id: 'platform_settings', label: t('titles.platformSettings'), icon: <SettingsOutlinedIcon />, comingSoon: true },
    )
  } else if (context === 'store' && (storeRole === 'owner' || storeRole === 'admin')) {
    items.push(
      { id: 'products', label: t('titles.products'), icon: <Inventory2OutlinedIcon /> },
      { id: 'orders', label: t('titles.orders'), icon: <ShoppingBagOutlinedIcon />, comingSoon: true },
      { id: 'sales', label: t('titles.sales'), icon: <AssessmentOutlinedIcon />, comingSoon: true },
      { id: 'store_settings', label: t('titles.storeSettings'), icon: <SettingsOutlinedIcon />, comingSoon: true },
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: sidebarCollapsed ? 1 : 2 }}>
      <Box sx={{ display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', px: sidebarCollapsed ? 0 : 1, py: 1.5 }}>
        <ButtonBase aria-label={t('nav.goDashboard')} onClick={() => handleNavigate('dashboard')} sx={{ display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', width: '100%', minHeight: 44, borderRadius: 1, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}>
          <TuPulperiaLogo variant={sidebarCollapsed ? 'icon' : 'horizontal'} size={sidebarCollapsed ? 'medium' : 'small'} alt="" />
        </ButtonBase>
      </Box>
      <Divider />
      {canSwitchContext && (
        <FormControl fullWidth={!sidebarCollapsed} size="small" sx={{ my: 1, ...(sidebarCollapsed ? { width: 56, mx: 'auto' } : {}) }}>
          <InputLabel id="dashboard-context-label" sx={sidebarCollapsed ? { position: 'absolute', width: 1, height: 1, p: 0, m: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 } : undefined}>{t('nav.context')}</InputLabel>
          <Select labelId="dashboard-context-label" id="dashboard-context" value={context} label={t('nav.context')} onChange={handleContextChange} renderValue={(value) => sidebarCollapsed ? (value === 'platform' ? <DashboardOutlinedIcon fontSize="small" /> : <StorefrontOutlinedIcon fontSize="small" />) : undefined}>
            {isPlatformAdmin && <MenuItem value="platform">{t('roles.superAdmin')}</MenuItem>}
            {storeRoleLabel && <MenuItem value={storeRole === 'employee' ? 'employee' : 'store'}>{storeRoleLabel}</MenuItem>}
          </Select>
        </FormControl>
      )}
      <List id="dashboard-navigation" component="nav" aria-label={t('nav.main')} sx={{ display: 'grid', gap: 0.5, py: 2 }}>
        {items.map((item) => (
          <Tooltip key={item.id} title={sidebarCollapsed ? item.label : ''} placement="right">
            <span>
              <ListItemButton
                selected={!item.comingSoon && activeSection === item.id}
                disabled={item.comingSoon}
                aria-label={sidebarCollapsed ? item.label : undefined}
                aria-current={!item.comingSoon && activeSection === item.id ? 'page' : undefined}
                onClick={() => handleNavigate(item.id)}
                sx={{ borderRadius: 2, minHeight: 48, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', px: sidebarCollapsed ? 1 : 2, '&.Mui-selected': { color: 'primary.main', bgcolor: 'primary.light' } }}
              >
                <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 40, justifyContent: 'center', color: 'inherit' }}>{item.icon}</ListItemIcon>
                {!sidebarCollapsed && <ListItemText primary={item.label} />}
                {!sidebarCollapsed && item.comingSoon && <Chip size="small" label={t('common:states.comingSoon')} variant="outlined" />}
              </ListItemButton>
            </span>
          </Tooltip>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', bgcolor: 'background.default' }}>
      {desktop ? (
        <Box component="aside" sx={{ width: desktopCollapsed ? 80 : 280, flexShrink: 0, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', transition: theme.transitions.create('width') }}>{sidebar}</Box>
      ) : (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} slotProps={{ paper: { sx: { width: 296 } } }}>{sidebar}</Drawer>
      )}
      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky">
          <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, gap: 1.5 }}>
            {!desktop && <IconButton edge="start" color="inherit" aria-label={t('nav.open')} aria-controls="dashboard-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} sx={{ minWidth: 48, minHeight: 48 }}><MenuOutlinedIcon /></IconButton>}
            {desktop ? (
              <IconButton aria-label={desktopCollapsed ? t('nav.expand') : t('nav.collapse')} onClick={() => setDesktopCollapsed((collapsed) => !collapsed)} sx={{ minWidth: 44, minHeight: 44 }}>
                {desktopCollapsed ? <ChevronRightOutlinedIcon /> : <ChevronLeftOutlinedIcon />}
              </IconButton>
            ) : (
              <IconButton aria-label={t('nav.goDashboard')} onClick={() => handleNavigate('dashboard')} sx={{ minWidth: 48, minHeight: 48 }}>
                <TuPulperiaLogo variant="icon" size="small" alt="" />
              </IconButton>
            )}
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>{pageTitle}</Typography>
            {desktop && <Box sx={{ minWidth: 0, textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{email}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none', letterSpacing: 0 }}>{identityRole}</Typography>
            </Box>}
            <LanguageToggle />
            <IconButton
              color="inherit"
              aria-label={t('nav.openAccountFor', { email })}
              aria-controls={accountAnchor ? accountMenuId : undefined}
              aria-haspopup="menu"
              aria-expanded={Boolean(accountAnchor)}
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              sx={{ minWidth: 48, minHeight: 48 }}
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.light', color: 'secondary.main' }}>{email.slice(0, 1).toUpperCase()}</Avatar>
            </IconButton>
            <Menu id={accountMenuId} anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)} slotProps={{ list: { 'aria-label': t('nav.account') } }}>
              <Box sx={{ px: 2, py: 1, maxWidth: 280 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{email}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none', letterSpacing: 0 }}>{identityRole}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setAccountAnchor(null); onLogout() }} sx={{ minHeight: 48 }}>
                <ListItemIcon><LogoutOutlinedIcon fontSize="small" /></ListItemIcon>
                <ListItemText>{t('common:actions.logOut')}</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3, lg: 4 } }}>{children}</Box>
      </Box>
    </Box>
  )
}
