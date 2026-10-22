import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useAppTranslation } from './useAppTranslation'
import type { AppLanguage } from './languageStorage'

export function LanguageToggle() {
  const { t, i18n } = useAppTranslation('common')
  const language: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'es'

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={language}
      aria-label={t('language.label')}
      onChange={(_event, value: AppLanguage | null) => { if (value) void i18n.changeLanguage(value) }}
      sx={{ flexShrink: 0, '& .MuiToggleButton-root': { minWidth: 44, minHeight: 40, px: 1.25, fontWeight: 700 } }}
    >
      <ToggleButton value="es" aria-label={t('language.spanish')}>ES</ToggleButton>
      <ToggleButton value="en" aria-label={t('language.english')}>EN</ToggleButton>
    </ToggleButtonGroup>
  )
}
