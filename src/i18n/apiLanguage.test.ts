import { describe, expect, it } from 'vitest'
import { normalizeApiLanguage } from './apiLanguage'

describe('API language normalization', () => {
  it('accepts supported base languages and regional variants', () => {
    expect(normalizeApiLanguage('es')).toBe('es')
    expect(normalizeApiLanguage('es-NI')).toBe('es')
    expect(normalizeApiLanguage('en')).toBe('en')
    expect(normalizeApiLanguage('en-US')).toBe('en')
  })

  it('falls back to Spanish for missing, malformed, or unsupported locales', () => {
    expect(normalizeApiLanguage(undefined)).toBe('es')
    expect(normalizeApiLanguage('')).toBe('es')
    expect(normalizeApiLanguage('fr-FR')).toBe('es')
    expect(normalizeApiLanguage('english')).toBe('es')
  })
})
