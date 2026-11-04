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
 * #794: the final logo in the email header — the on-dark PRIMARY
 * LOCKUP master (V1 Route-End symbol + W3 Destination Tittle wordmark,
 * white ring/letters, sunset-orange arc/dot/tittle) inlined as SVG,
 * the only image form email clients render without a hosted asset.
 * It replaces the interim pin mark (#570) and the hand-typeset HTML
 * wordmark; the header sits on navy, hence the on-dark colourway.
 * The Latin wordmark is used in all locales, including Arabic.
 */
export const EMAIL_LOGO_SVG = `<svg width="128" height="36" viewBox="0 0 427 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ouiboo"><title>Ouiboo</title><g><path d="M 86.41 54.39 A 27.0 27.0 0 1 1 41.24 40.58" fill="none" stroke="#FFFFFF" stroke-width="16.0" stroke-linecap="butt"/><path d="M 44.13 38.16 A 27.0 27.0 0 0 1 68.34 34.32" fill="none" stroke="#FF6B35" stroke-width="16.0" stroke-linecap="butt"/><circle cx="80.68" cy="42.64" r="8.5" fill="#FF6B35"/></g><g transform="translate(144 0)"><circle cx="29.16" cy="67.58" r="19.51" fill="none" stroke="#FFFFFF" stroke-width="13.82"/><g transform="translate(58.33 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M613 558V0H442V76Q416 39 371.5 16.5Q327 -6 273 -6Q209 -6 160.0 22.5Q111 51 84.0 105.0Q57 159 57 232V558H227V255Q227 199 256.0 168.0Q285 137 334 137Q384 137 413.0 168.0Q442 199 442 255V558Z" fill="#FFFFFF"/></g><g transform="translate(108.34 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M46 708Q46 748 74.5 774.5Q103 801 148 801Q192 801 220.5 774.5Q249 748 249 708Q249 669 220.5 642.5Q192 616 148 616Q103 616 74.5 642.5Q46 669 46 708Z" fill="#FF6B35"/></g><g transform="translate(108.34 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M233 558V0H62V558Z" fill="#FFFFFF"/></g><g transform="translate(130.23 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M405 566Q474 566 530.0 531.0Q586 496 618.5 431.0Q651 366 651 280Q651 194 618.5 128.5Q586 63 530.0 27.5Q474 -8 405 -8Q346 -8 302.0 15.5Q258 39 233 78V0H62V740H233V479Q257 518 302.0 542.0Q347 566 405 566ZM354 417Q303 417 267.5 380.0Q232 343 232 279Q232 215 267.5 178.0Q303 141 354 141Q405 141 441.0 178.5Q477 216 477 280Q477 344 441.5 380.5Q406 417 354 417Z" fill="#FFFFFF"/></g><circle cx="204.25" cy="72.70" r="15.81" fill="none" stroke="#FFFFFF" stroke-width="10.98"/><circle cx="251.52" cy="72.70" r="15.81" fill="none" stroke="#FFFFFF" stroke-width="10.98"/></g></svg>`

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
                ${EMAIL_LOGO_SVG}
                <div style="color:#C9D8E5;font-size:12px;margin-top:6px;letter-spacing:0.04em;">${escapeHtml(strings.layout.tagline)}</div>
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

/**
 * #638: the entity set the converter decodes — exactly the entities the
 * email templates emit. Decoding runs as ONE pass with a lookup, so an
 * escaped entity is decoded at most once: `&amp;lt;` becomes the literal
 * text `&lt;`, never `<` (the old chained replaces double-decoded it —
 * CodeQL js/double-escaping).
 */
const PLAIN_TEXT_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#039': "'",
}

function decodePlainTextEntities(text: string): string {
  return text.replace(/&(nbsp|amp|lt|gt|quot|#039);/g, (_whole, name: string) => PLAIN_TEXT_ENTITIES[name])
}

/** Tags whose END (for `br`: the tag itself) maps to a line break, matching
 * the converter's long-standing output for the standard templates. */
const PLAIN_TEXT_BREAK_TAGS = new Set(['br', '/p', '/div', '/li', '/tr', '/h1', '/h2', '/h3', '/h4', '/h5', '/h6'])
/** Sections removed with their contents (never rendered as text). */
const PLAIN_TEXT_DROPPED_SECTIONS = new Set(['style', 'head'])

/**
 * Convert rendered email HTML to its plain-text alternative.
 *
 * #638: tag stripping is a single-pass scanner, not a chain of regex
 * replaces (CodeQL js/incomplete-multi-character-sanitization: a regex
 * pass can leave a re-formed tag behind, and sequential passes can
 * re-process each other's output). The scanner walks the input once,
 * tracks tag boundaries explicitly, drops <style>/<head> sections with
 * their contents, turns the block-level tags above into line breaks,
 * and decodes entities in text runs exactly once. Output for the
 * standard transactional/marketing templates is pinned by golden tests
 * in email-template.spec.ts and is unchanged by this rewrite.
 */
export function emailToPlainText(html: string): string {
  const lower = html.toLowerCase()
  let out = ''
  let i = 0
  while (i < html.length) {
    const open = html.indexOf('<', i)
    if (open === -1) {
      out += decodePlainTextEntities(html.slice(i))
      break
    }
    if (open > i) out += decodePlainTextEntities(html.slice(i, open))
    const close = html.indexOf('>', open)
    if (close === -1) {
      // Unterminated tag at end of input: the old converter left the
      // remainder as text; keep that.
      out += decodePlainTextEntities(html.slice(open))
      break
    }
    const tagBody = lower.slice(open + 1, close).trim()
    const tagName = tagBody.split(/[\s/]/, 1)[0]
    if (PLAIN_TEXT_DROPPED_SECTIONS.has(tagName)) {
      const sectionClose = lower.indexOf(`</${tagName}`, close)
      if (sectionClose !== -1) {
        const sectionCloseEnd = html.indexOf('>', sectionClose)
        i = sectionCloseEnd === -1 ? html.length : sectionCloseEnd + 1
        continue
      }
    }
    if (PLAIN_TEXT_BREAK_TAGS.has(tagBody)) out += '\n'
    i = close + 1
  }
  return out
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
