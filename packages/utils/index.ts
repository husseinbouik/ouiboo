export const DEFAULT_CURRENCY = 'MAD'
export const DEFAULT_LOCALE = 'en-MA'

const LANGUAGE_LOCALES: Record<string, string> = {
  ar: 'ar-MA',
  en: 'en-MA',
  fr: 'fr-MA',
}

export function resolveLocale(localeOrLanguage?: string | null): string {
  const normalized = localeOrLanguage?.trim().replace('_', '-')
  if (!normalized) return DEFAULT_LOCALE
  if (normalized.includes('-')) return normalized
  return LANGUAGE_LOCALES[normalized.toLowerCase()] || normalized
}

export function normalizeCurrency(currency?: string | null): string {
  const normalized = currency?.trim().toUpperCase()
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : DEFAULT_CURRENCY
}

export function formatCurrency(
  value: number | string,
  currency?: string | null,
  localeOrLanguage?: string | null,
  options: Intl.NumberFormatOptions = {},
): string {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return '—'

  return new Intl.NumberFormat(resolveLocale(localeOrLanguage), {
    style: 'currency',
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
    ...options,
  }).format(numericValue)
}

export function formatLocalDate(
  value: Date | string | number,
  localeOrLanguage?: string | null,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(resolveLocale(localeOrLanguage), options).format(date)
}
