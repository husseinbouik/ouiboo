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

export function emailPanel(content: string, tone: 'neutral' | 'warning' | 'danger' = 'neutral'): string {
  const toneStyles = {
    neutral: { background: '#EEF5F8', border: '#177E89', color: BRAND.navy },
    warning: { background: '#FFF7E8', border: '#D97706', color: '#7C2D12' },
    danger: { background: '#FFF0F0', border: '#DC2626', color: '#7F1D1D' },
  }[tone]

  return `<div style="margin:24px 0;padding:18px 20px;background:${toneStyles.background};border-left:4px solid ${toneStyles.border};border-radius:10px;color:${toneStyles.color};font-size:15px;line-height:1.6;">${content}</div>`
}

export function emailStrong(value: string): string {
  return `<strong>${escapeHtml(value)}</strong>`
}

type EmailLayoutOptions = {
  title: string
  preheader: string
  content: string
}

export function renderEmail({ title, preheader, content }: EmailLayoutOptions): string {
  const year = new Date().getFullYear()
  return `<!doctype html>
<html lang="en">
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
                <div style="color:${BRAND.white};font-size:24px;font-weight:900;letter-spacing:-0.03em;">Oui<span style="color:#FF8A4C;">boo</span></div>
                <div style="color:#C9D8E5;font-size:12px;margin-top:4px;letter-spacing:0.04em;">Travel made personal</div>
              </td>
            </tr>
            <tr>
              <td class="ouiboo-body" style="padding:34px 32px 26px;">${content}</td>
            </tr>
            <tr>
              <td class="ouiboo-footer" style="padding:20px 32px 26px;border-top:1px solid ${BRAND.border};color:#718096;font-size:12px;line-height:1.6;text-align:center;">
                This is a service message from Ouiboo.<br>
                &copy; ${year} Ouiboo. All rights reserved.
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
