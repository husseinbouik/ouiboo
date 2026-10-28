import type { NextRequest } from 'next/server'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@ouiboo/i18n/server'
import { renderOgImage } from '../../lib/og-image'

/**
 * Locale-carrying OG image (#563): `/og-image?lang=fr` renders the
 * French preview, `?lang=ar` the Arabic one. The metadata in
 * `lib/metadata.ts` points each locale's `og:image` here so a shared
 * link shows a preview in the language it was shared in. The static
 * `opengraph-image.tsx` convention file renders the same image in the
 * default locale as a fallback.
 */
export function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('lang')?.split('-')[0]?.toLowerCase()
  const locale: SupportedLanguage = SUPPORTED_LANGUAGES.includes(requested as SupportedLanguage)
    ? (requested as SupportedLanguage)
    : 'en'
  return renderOgImage(locale)
}
