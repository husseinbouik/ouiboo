import {
  emailButton,
  emailHeading,
  emailParagraph,
  emailToPlainText,
  escapeHtml,
  maskEmail,
  renderEmail,
  sanitizeEmailSubject,
} from './email-template'

describe('email template safety', () => {
  it('escapes user-controlled HTML', () => {
    const value = '<img src=x onerror="alert(1)"> & company'
    const html = emailParagraph(value)

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(html).toContain('&amp; company')
    expect(escapeHtml("'\"<>&")).toBe('&#039;&quot;&lt;&gt;&amp;')
  })

  it('allows only HTTP and HTTPS links in email buttons', () => {
    expect(emailButton('Open', 'javascript:alert(1)')).toContain('href="#"')
    expect(emailButton('Open', 'https://app.ouiboo.test/bookings/1')).toContain(
      'href="https://app.ouiboo.test/bookings/1"',
    )
  })

  it('renders a responsive branded shell and a usable text alternative', () => {
    const html = renderEmail({
      title: 'Booking received',
      preheader: 'Your booking is in.',
      content: `${emailHeading('Booking received')}${emailParagraph('Your booking is ready.')}`,
    })
    const text = emailToPlainText(html)

    expect(html).toContain('name="viewport"')
    expect(html).toContain('Travel made personal')
    expect(html).toContain('role="presentation"')
    expect(text).toContain('Booking received')
    expect(text).toContain('Your booking is ready.')
    expect(text).not.toContain('<p')
  })

  it('prevents header injection and masks recipient logs', () => {
    expect(sanitizeEmailSubject('Booking\r\nBcc: attacker@example.com')).toBe(
      'Booking Bcc: attacker@example.com',
    )
    expect(maskEmail('traveler@example.com')).toBe('t***@example.com')
    expect(maskEmail('invalid')).toBe('[redacted]')
  })
})
