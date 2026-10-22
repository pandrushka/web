import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { TablePagination } from '@mui/material'
import i18n from './index'
import { getInitialLanguage, LANGUAGE_STORAGE_KEY, persistLanguage } from './languageStorage'
import { LanguageToggle } from './LanguageToggle'
import { useAppTranslation } from './useAppTranslation'
import { BrandThemeProvider } from '../theme/BrandThemeProvider'

function TranslationProbe() {
  const { t } = useAppTranslation('auth')
  return <span>{t('signInHeading')}</span>
}

function MuiLocaleProbe() {
  return <TablePagination component="div" count={0} page={0} rowsPerPage={10} onPageChange={() => undefined} onRowsPerPageChange={() => undefined} />
}

function translationKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => translationKeys(child, prefix ? `${prefix}.${key}` : key)).sort()
}

afterEach(async () => {
  await i18n.changeLanguage('es')
})

describe('frontend language system', () => {
  it('uses Spanish for a first-time visitor and safely reads a saved preference', () => {
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY)
    expect(getInitialLanguage()).toBe('es')
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    expect(getInitialLanguage()).toBe('en')
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')
    expect(getInitialLanguage()).toBe('es')
  })

  it('keeps the preference independent from authentication session storage', async () => {
    await i18n.changeLanguage('en')
    window.localStorage.setItem('forme.auth.session', JSON.stringify({ access_token: 'test-token' }))
    window.localStorage.removeItem('forme.auth.session')
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(getInitialLanguage()).toBe('en')
  })

  it('continues in memory when browser storage is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('Storage unavailable') } })
    expect(getInitialLanguage()).toBe('es')
    expect(() => persistLanguage('en')).not.toThrow()
    if (descriptor) Object.defineProperty(window, 'localStorage', descriptor)
  })

  it('switches immediately and persists the selected language', async () => {
    await i18n.changeLanguage('es')
    const user = userEvent.setup()
    render(<><LanguageToggle /><TranslationProbe /></>)
    expect(screen.getByText('Qué bueno verte de nuevo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(await screen.findByText('Welcome back')).toBeInTheDocument()
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('updates Material UI localization when the language changes', async () => {
    await i18n.changeLanguage('es')
    const user = userEvent.setup()
    render(<BrandThemeProvider><LanguageToggle /><MuiLocaleProbe /></BrandThemeProvider>)

    expect(screen.getByText('Filas por página:')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(await screen.findByText('Rows per page:')).toBeInTheDocument()
  })

  it('keeps translation keys synchronized across every namespace', () => {
    for (const namespace of i18n.options.ns as string[]) {
      expect(translationKeys(i18n.getResourceBundle('es', namespace))).toEqual(translationKeys(i18n.getResourceBundle('en', namespace)))
    }
  })

  it('falls back to Spanish for an unsupported locale and exposes missing keys clearly', async () => {
    await i18n.changeLanguage('fr')
    expect(i18n.resolvedLanguage).toBe('es')
    expect(i18n.t('translationThatDoesNotExist', { ns: 'auth' })).toBe('translationThatDoesNotExist')
    persistLanguage('es')
  })
})
