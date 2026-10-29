import {
  emailButton,
  emailHeading,
  emailPanel,
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
    // #563/#570: the shell carries the one canonical cross-surface
    // tagline — the same line as the landing OG (PR #590) and the
    // traveller OG (PR #593). The retired 'Find trips worth
    // remembering' line must not reappear. With no recorded locale
    // the shell renders the French default.
    expect(html).toContain('Le voyage rendu personnel')
    expect(html).not.toContain('Find trips worth remembering')
    expect(html).toContain('role="presentation"')
    const htmlEn = renderEmail({
      title: 'Booking received',
      preheader: 'Your booking is in.',
      content: emailParagraph('Hello'),
      locale: 'en',
    })
    expect(htmlEn).toContain('Travel made personal')
    const htmlAr = renderEmail({
      title: 'Booking received',
      preheader: 'Your booking is in.',
      content: emailParagraph('Hello'),
      locale: 'ar',
    })
    expect(htmlAr).toContain('سفر مصمم على مقاسك')
    expect(text).toContain('Booking received')
    expect(text).toContain('Your booking is ready.')
    expect(text).not.toContain('<p')
  })

  it('renders the pin mark in the header lockup (#570)', () => {
    const html = renderEmail({
      title: 'Booking received',
      preheader: 'Your booking is in.',
      content: emailParagraph('Hello'),
    })
    // The adopted pin logo: navy tile, white O ring, sunset-orange pin.
    expect(html).toContain('<svg width="36" height="36" viewBox="0 0 32 32"')
    expect(html).toContain('fill="#FF6B35"')
    expect(html).toContain('fill="#0A192F"')
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
      // Explicit locale: this test pins the English marketing copy
      // (#570 made French the unrecorded-locale default).
      locale: 'en',
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

describe('emailToPlainText hardening (#638)', () => {
  // Golden pins: captured from the pre-#638 converter. The scanner
  // rewrite must not change standard template output by a single char.
  it('keeps the transactional template plain text byte-identical', () => {
    const html = renderEmail({
      title: 'Booking received',
      preheader: 'Your booking is in.',
      content: `${emailHeading('Booking received')}${emailParagraph('Hi Amina, your booking is ready & confirmed.')}${emailPanel('<strong>Atlas Trek</strong> — 1 200 MAD')}${emailButton('View booking', 'https://app.ouiboo.test/bookings/1')}`,
    })
    const year = new Date().getFullYear()
    expect(emailToPlainText(html)).toBe(
      `Your booking is in.\n\n                      Ouiboo\n\n                      Le voyage rendu personnel\n\n              Booking received\nHi Amina, your booking is ready & confirmed.\nAtlas Trek — 1 200 MAD\n\n          View booking\n\n                Ceci est un message de service de Ouiboo.\n&copy; ${year} Ouiboo. Tous droits réservés.`,
    )
  })

  it('keeps the marketing template plain text byte-identical', () => {
    const html = renderMarketingEmail({
      title: 'Ouiboo is live',
      preheader: 'We launched',
      content: emailParagraph('Hello!'),
      unsubscribeUrl: 'https://api.ouiboo.test/api/v1/email/unsubscribe?t=abc.def',
      postalAddress: 'Ouiboo, 12 Rue Example, Casablanca, Morocco',
      locale: 'en',
    })
    const year = new Date().getFullYear()
    expect(emailToPlainText(html)).toBe(
      `We launched\n\n                      Ouiboo\n\n                      Travel made personal\n\n              Hello!\n\n                You are receiving this email because you subscribed to Ouiboo updates.\nOuiboo, 12 Rue Example, Casablanca, Morocco\nUnsubscribe &middot; &copy; ${year} Ouiboo. All rights reserved.`,
    )
  })

  it('decodes each entity at most once: &amp;lt; stays literal text', () => {
    expect(emailToPlainText('<p>Fish &amp; Chips</p>')).toBe('Fish & Chips')
    expect(emailToPlainText('<p>1 &amp;lt; 2</p>')).toBe('1 &lt; 2')
    expect(emailToPlainText('<p>&amp;amp;</p>')).toBe('&amp;')
    expect(emailToPlainText('<p>a &lt; b &gt; c</p>')).toBe('a < b > c')
  })

  it('strips nested and broken tags without leaking markup', () => {
    expect(emailToPlainText('<scr<script>ipt>alert(1)')).toBe('ipt>alert(1)')
    expect(emailToPlainText('<<div>hello</div>')).toBe('hello')
    expect(emailToPlainText('<p title="a>b">kept</p>')).toBe('b">kept')
  })

  it('drops style and head contents entirely', () => {
    const html = '<html><head><title>Secret title</title><style>.x{color:red}</style></head><body><p>Visible</p><style>.y{}</style></body></html>'
    expect(emailToPlainText(html)).toBe('Visible')
  })
})
