/** Format Rails decimal strings without converting money through floating point. */
export function formatNioPrice(price: string, language: string | undefined): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(price)
  if (!match) return `C$ ${price}`

  const [, sign, integerPart, fractionPart = ''] = match
  const locale = language === 'en' ? 'en-US' : 'es-NI'
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6)
  const groupSeparator = parts.find((part) => part.type === 'group')?.value ?? ','
  const decimalSeparator = parts.find((part) => part.type === 'decimal')?.value ?? '.'
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
  const amount = `${sign}${groupedInteger}${fractionPart ? `${decimalSeparator}${fractionPart}` : ''}`

  return `C$ ${amount}`
}
