import type { PropsWithChildren } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { brandTheme } from './theme'

export function BrandThemeProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={brandTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
