import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { AppView } from '../types/navigation'
import { BrandHeader } from './BrandHeader'
import { useAppTranslation } from '../i18n/useAppTranslation'

type AppDrawerProps = {
  open: boolean
  activeView: AppView
  canEditQuestions: boolean
  onClose: () => void
  onNavigate: (view: AppView) => void
}

export function AppDrawer({ open, activeView, canEditQuestions, onClose, onNavigate }: AppDrawerProps) {
  const { t } = useAppTranslation('legacy')
  const items: Array<{ label: string; view: AppView; icon: ReactNode }> = [
    { label: t('nav.dashboard'), view: 'dashboard', icon: <DashboardOutlinedIcon /> },
    { label: t('nav.questionnaire'), view: 'questionnaire', icon: <QuizOutlinedIcon /> },
  ]

  if (canEditQuestions) {
    items.push({ label: t('nav.editQuestionnaire'), view: 'edit_questionnaire', icon: <EditNoteOutlinedIcon /> })
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <Stack spacing={2} sx={{ width: 292, p: 2.5 }}>
        <BrandHeader />
        <Typography variant="body2" color="text.secondary">
          {t('nav.help')}
        </Typography>
        <List sx={{ display: 'grid', gap: 0.5 }}>
          {items.map((item) => (
            <ListItemButton
              key={item.view}
              selected={activeView === item.view}
              onClick={() => {
                onNavigate(item.view)
                onClose()
              }}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Stack>
    </Drawer>
  )
}
