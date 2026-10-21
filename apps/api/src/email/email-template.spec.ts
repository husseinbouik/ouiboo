import {
  emailButton,
  emailHeading,
  emailParagraph,
  emailToPlainText,
  escapeHtml,
  maskEmail,
  renderEmail,
  renderMarketingEmail,
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

describe('marketing email layout (#322)', () => {
  it('renders the physical address and a working unsubscribe link', () => {
    const html = renderMarketingEmail({
      title: 'Ouiboo is live',
      preheader: 'We launched',
      content: emailParagraph('Hello!'),
      unsubscribeUrl: 'https://api.ouiboo.test/api/v1/email/unsubscribe?t=abc.def',
      postalAddress: 'Ouiboo, 12 Rue Example, Casablanca, Morocco',
    })
    expect(html).toContain('Ouiboo, 12 Rue Example, Casablanca, Morocco')
    expect(html).toContain('href="https://api.ouiboo.test/api/v1/email/unsubscribe?t=abc.def"')
    expect(html).toContain('Unsubscribe')
    // Marketing mail must not claim to be a service message
    expect(html).not.toContain('This is a service message from Ouiboo.')
  })

  it('escapes a hostile postal address', () => {
    const html = renderMarketingEmail({
      title: 't',
      preheader: 'p',
      content: 'c',
      unsubscribeUrl: 'https://api.ouiboo.test/u',
      postalAddress: '<script>alert(1)</script>',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
