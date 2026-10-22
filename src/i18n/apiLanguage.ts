import i18n from './index'

export function normalizeApiLanguage(language: unknown): 'es' | 'en' {
  if (typeof language !== 'string') return 'es'
  const baseLanguage = language.toLowerCase().split(/[-_]/, 1)[0]

  return baseLanguage === 'en' ? 'en' : 'es'
}

/** Resolve the active application language for Rails requests. */
export function getApiLanguage(): 'es' | 'en' {
  return normalizeApiLanguage(i18n.resolvedLanguage ?? i18n.language)
}
