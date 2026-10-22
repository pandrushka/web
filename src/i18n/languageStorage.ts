export type AppLanguage = 'es' | 'en'

export const LANGUAGE_STORAGE_KEY = 'tu-pulperia.language'

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'es' || value === 'en'
}

export function getInitialLanguage(): AppLanguage {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isAppLanguage(value) ? value : 'es'
  } catch {
    return 'es'
  }
}

export function persistLanguage(language: AppLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Keep the in-memory language change when storage is unavailable.
  }
}
