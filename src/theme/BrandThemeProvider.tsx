import type { PropsWithChildren } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import { enUS, esES } from '@mui/material/locale'
import { useMemo } from 'react'
import { useAppTranslation } from '../i18n/useAppTranslation'
import { brandTheme } from './theme'

export function BrandThemeProvider({ children }: PropsWithChildren) {
  const { i18n } = useAppTranslation('common')
  const muiLocale = i18n.resolvedLanguage === 'en' ? enUS : esES
  const theme = useMemo(() => createTheme(brandTheme, muiLocale), [muiLocale])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
