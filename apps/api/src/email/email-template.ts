import {
  emailDirection,
  emailStrings,
  normalizeEmailLocale,
  type EmailLocale,
} from './email-i18n'

const BRAND = {
  navy: '#071B33',
  slate: '#425466',
  border: '#DCE5EC',
  surface: '#F4F7F9',
  coral: '#F26B38',
  white: '#FFFFFF',
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function safeEmailUrl(value: string): string {
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)) return '#'
    return escapeHtml(url.toString())
  } catch {
    return '#'
  }
}

export function sanitizeEmailSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, 180)
}

export function maskEmail(value: string): string {
  const [localPart, domain] = value.split('@')
  if (!localPart || !domain) return '[redacted]'
  return `${localPart.slice(0, 1)}***@${domain}`
}

export function emailHeading(value: string): string {
  return `<h1 style="color:${BRAND.navy};font-size:26px;line-height:1.25;margin:0 0 16px;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(value)}</h1>`
}

export function emailParagraph(value: string): string {
  return `<p style="color:${BRAND.slate};font-size:16px;line-height:1.65;margin:0 0 18px;">${escapeHtml(value)}</p>`
}

export function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px auto;">
      <tr>
        <td style="border-radius:12px;background:${BRAND.coral};">
          <a href="${safeEmailUrl(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 24px;color:${BRAND.white};font-size:15px;font-weight:800;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`
}

export function emailPanel(content: string, tone: 'neutral' | 'warning' | 'danger' = 'neutral', locale?: EmailLocale | string | null): string {
  const toneStyles = {
    neutral: { background: '#EEF5F8', border: '#177E89', color: BRAND.navy },
    warning: { background: '#FFF7E8', border: '#D97706', color: '#7C2D12' },
    danger: { background: '#FFF0F0', border: '#DC2626', color: '#7F1D1D' },
  }[tone]

  // #424: in RTL locales the accent border sits on the inline-start side.
  const borderSide = emailDirection(normalizeEmailLocale(locale)) === 'rtl' ? 'border-right' : 'border-left'
  return `<div style="margin:24px 0;padding:18px 20px;background:${toneStyles.background};${borderSide}:4px solid ${toneStyles.border};border-radius:10px;color:${toneStyles.color};font-size:15px;line-height:1.6;">${content}</div>`
}

export function emailStrong(value: string): string {
  return `<strong>${escapeHtml(value)}</strong>`
}

type EmailLayoutOptions = {
  title: string
  preheader: string
  content: string
  footerHtml?: string
  /** #424: recipient locale — sets <html lang>/dir and localizes the
   * shell (tagline, default footer). Defaults to French (#570). */
  locale?: EmailLocale | string | null
}

/**
 * #570 (Council Session #3, P1-12): the pin mark in the email lockup.
 * Transactional mail previously rendered the wordmark alone, without the
 * pin that identifies Ouiboo everywhere else. This is the adopted pin
 * logo (packages/ui/Logo.tsx — navy tile, white O ring, sunset-orange
 * pin, navy centre dot) inlined as SVG, the only image form email
 * clients render without a hosted asset.
 */
export const EMAIL_PIN_LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ouiboo"><rect width="32" height="32" rx="8" fill="#0A192F"/><path d="M16 8C11.5817 8 8 11.5817 8 16C8 20.4183 11.5817 24 16 24C20.4183 24 24 20.4183 24 16C24 11.5817 20.4183 8 16 8ZM16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22Z" fill="white"/><path d="M16 21.4C15.3 19.8 12.6 17.9 12.6 14.8A3.4 3.4 0 1 1 19.4 14.8C19.4 17.9 16.7 19.8 16 21.4Z" fill="#FF6B35"/><circle cx="16" cy="14.8" r="1.5" fill="#0A192F"/></svg>`

export function renderEmail({ title, preheader, content, footerHtml, locale }: EmailLayoutOptions): string {
  const year = new Date().getFullYear()
  const resolvedLocale = normalizeEmailLocale(locale)
  const dir = emailDirection(resolvedLocale)
  const strings = emailStrings(resolvedLocale)
  return `<!doctype html>
<html lang="${resolvedLocale}" dir="${dir}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width:620px){
        .ouiboo-shell{padding:16px 10px!important}
        .ouiboo-card{border-radius:16px!important}
        .ouiboo-header,.ouiboo-body,.ouiboo-footer{padding-left:22px!important;padding-right:22px!important}
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${BRAND.surface};">
      <tr>
        <td class="ouiboo-shell" align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ouiboo-card" style="max-width:600px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:22px;overflow:hidden;">
            <tr>
              <td class="ouiboo-header" style="padding:24px 32px;background:${BRAND.navy};">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">${EMAIL_PIN_LOGO_SVG}</td>
                    <td style="vertical-align:middle;">
                      <div style="color:${BRAND.white};font-size:24px;font-weight:900;letter-spacing:-0.03em;">Oui<span style="color:#FF8A4C;">boo</span></div>
                      <div style="color:#C9D8E5;font-size:12px;margin-top:4px;letter-spacing:0.04em;">${escapeHtml(strings.layout.tagline)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="ouiboo-body" style="padding:34px 32px 26px;">${content}</td>
            </tr>
            <tr>
              <td class="ouiboo-footer" style="padding:20px 32px 26px;border-top:1px solid ${BRAND.border};color:#718096;font-size:12px;line-height:1.6;text-align:center;">
                ${footerHtml ?? `${escapeHtml(strings.layout.serviceFooter)}<br>&copy; ${year} Ouiboo. ${escapeHtml(strings.layout.allRightsReserved)}`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function emailToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type MarketingEmailOptions = EmailLayoutOptions & {
  unsubscribeUrl: string
  postalAddress: string
}

// Marketing layout (#322): CAN-SPAM / Law 09-08 / GDPR require a physical
// postal address and a working unsubscribe in every marketing send. This
// variant is deliberately separate from the transactional (service) layout.
export function renderMarketingEmail({ title, preheader, content, unsubscribeUrl, postalAddress, locale }: MarketingEmailOptions): string {
  const year = new Date().getFullYear()
  const strings = emailStrings(locale)
  const addressHtml = escapeHtml(postalAddress).replaceAll('\n', '<br>')
  const footerHtml = `${escapeHtml(strings.layout.marketingReceivedBecause)}<br>${addressHtml}<br><a href="${safeEmailUrl(unsubscribeUrl)}" style="color:#718096;text-decoration:underline;">${escapeHtml(strings.layout.unsubscribe)}</a> &middot; &copy; ${year} Ouiboo. ${escapeHtml(strings.layout.allRightsReserved)}`
  return renderEmail({ title, preheader, content, footerHtml, locale })
}
