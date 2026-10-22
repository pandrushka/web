import { describe, expect, it } from 'vitest'
import { formatNioPrice } from './formatNioPrice'

describe('formatNioPrice', () => {
  it('formats Spanish and English separators without floating-point conversion', () => {
    expect(formatNioPrice('12345678901.05', 'es')).toBe('C$ 12,345,678,901.05')
    expect(formatNioPrice('12345678901.05', 'en')).toBe('C$ 12,345,678,901.05')
  })

  it('preserves the supplied fractional precision and safely falls back to Spanish', () => {
    expect(formatNioPrice('12.50', undefined)).toBe('C$ 12.50')
    expect(formatNioPrice('12', 'es')).toBe('C$ 12')
    expect(formatNioPrice('invalid', 'en')).toBe('C$ invalid')
  })
})
