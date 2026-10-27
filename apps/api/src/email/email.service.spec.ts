import { EmailService } from './email.service'

describe('EmailService templates', () => {
  const service = new EmailService()
  const malicious = '<svg onload="alert(1)">Agency & Co</svg>'

  it('escapes personalized fields across transactional templates', () => {
    const templates = [
      service.getWelcomeTemplate(malicious),
      service.getPaymentReminderTemplate(malicious, 2, 'https://app.ouiboo.test/bookings/1'),
      service.getTripReminderTemplate(malicious, 7, malicious, 'https://app.ouiboo.test/trips/1'),
      service.getReviewRequestTemplate(malicious, malicious, 'https://app.ouiboo.test/reviews/1'),
      service.getAutoUnpaidCancellationTemplate(malicious, malicious),
    ]

    for (const html of templates) {
      expect(html).toContain('<!doctype html>')
      expect(html).not.toContain('<svg onload=')
      expect(html).toContain('&lt;svg')
    }
  })

  it('does not emit unsafe password reset links', () => {
    const html = service.getPasswordResetTemplate('javascript:alert(1)')
    expect(html).toContain('href="#"')
    expect(html).not.toContain('href="javascript:')
  })

  it('escapes verification codes', () => {
    const html = service.getOTPTemplate('<script>alert(1)</script>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})

describe('EmailService booking seller block (B4)', () => {
  const service = new EmailService()

  const captureTravelerHtml = async (seller: any) => {
    const sendEmail = jest
      .spyOn(service as any, 'sendEmail')
      .mockResolvedValue(true)
    await service.sendBookingNotification(
      'traveler@example.com',
      'agency@example.com',
      'booking-1',
      'Atlas Trek',
      'en',
      null,
      seller,
    )
    const html = sendEmail.mock.calls[0][2] as string
    sendEmail.mockRestore()
    return html
  }

  const completeSeller = {
    legalName: 'Atlas Adventures SARL',
    companyName: 'Atlas Adventures',
    travelLicenceType: 'ODV',
    travelLicenceNumber: 'AV-2024-0187',
    licenceVerified: true,
    licenceIssuedAt: new Date('2024-03-15T00:00:00.000Z'),
    licenceIssuingAuthority: 'Ministère du Tourisme',
  }

  it('renders the complete seller block for a verified agency', async () => {
    const html = await captureTravelerHtml(completeSeller)
    expect(html).toContain('Your seller')
    expect(html).toContain('Atlas Adventures SARL')
    expect(html).toContain('ODV AV-2024-0187')
    expect(html).toContain('Issued on')
    expect(html).toContain('Ministère du Tourisme')
  })

  it('shows the honest pending line when the issue data is missing (legacy record)', async () => {
    const html = await captureTravelerHtml({
      ...completeSeller,
      licenceIssuedAt: null,
      licenceIssuingAuthority: null,
    })
    expect(html).toContain('AV-2024-0187')
    expect(html).toContain('being confirmed with the agency')
    expect(html).not.toContain('Issued on')
  })

  it('never renders a licence line for an unverified licence', async () => {
    const html = await captureTravelerHtml({ ...completeSeller, licenceVerified: false })
    expect(html).toContain('Atlas Adventures SARL')
    expect(html).not.toContain('AV-2024-0187')
    expect(html).not.toContain('Issued on')
  })

  it('omits the block entirely without seller data', async () => {
    const html = await captureTravelerHtml(null)
    expect(html).not.toContain('Your seller')
  })
})

describe('EmailService delivery', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('sends branded HTML with a plain-text alternative and a safe subject', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-1' })
    const service = new EmailService()
    ;(service as any).transporter = { sendMail }
    process.env.SMTP_USER = 'delivery@ouiboo.test'

    await service.sendEmail(
      'traveler@example.com',
      'Booking confirmed\r\nBcc: attacker@example.com',
      service.getWelcomeTemplate('Amina'),
    )

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: '"Ouiboo" <delivery@ouiboo.test>',
      to: 'traveler@example.com',
      subject: 'Booking confirmed Bcc: attacker@example.com',
      html: expect.stringContaining('<!doctype html>'),
      text: expect.stringContaining('Welcome to Ouiboo, Amina!'),
    }))
  })

  it('fails closed when delivery is unavailable in production', async () => {
    delete process.env.SMTP_HOST
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    process.env.NODE_ENV = 'production'
    const service = new EmailService()

    await expect(service.sendEmail('traveler@example.com', 'Subject', '<p>Body</p>'))
      .rejects.toThrow('Email delivery is unavailable')
  })

  it('propagates delivery failures so callers can retry or report them', async () => {
    const service = new EmailService()
    ;(service as any).transporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('temporary failure')),
    }

    await expect(service.sendEmail('traveler@example.com', 'Subject', '<p>Body</p>'))
      .rejects.toThrow('Email delivery failed: temporary failure')
  })
})

describe('EmailService marketing compliance (#322)', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('round-trips an unsubscribe token and rejects tampering', () => {
    const service = new EmailService()
    const token = service.createUnsubscribeToken('Person@Example.com')
    expect(service.verifyUnsubscribeToken(token)).toBe('person@example.com')
    expect(service.verifyUnsubscribeToken(token.replace(/.$/, 'x'))).toBeNull()
    expect(service.verifyUnsubscribeToken('not-a-token')).toBeNull()
    expect(service.verifyUnsubscribeToken('')).toBeNull()
  })

  it('fails closed when no postal address is configured', async () => {
    delete process.env.OUIBOO_POSTAL_ADDRESS
    const service = new EmailService({ emailSuppression: { findUnique: jest.fn(), upsert: jest.fn() } } as never)
    await expect(
      service.sendMarketingEmail('a@b.co', 'Launch', { title: 't', preheader: 'p', content: 'c' }),
    ).rejects.toThrow('OUIBOO_POSTAL_ADDRESS')
  })

  it('skips suppressed addresses without sending', async () => {
    process.env.OUIBOO_POSTAL_ADDRESS = 'Ouiboo, Casablanca, Morocco'
    const db = {
      emailSuppression: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sup-1', email: 'a@b.co' }),
        upsert: jest.fn(),
      },
    }
    const service = new EmailService(db as never)
    const outcome = await service.sendMarketingEmail('a@b.co', 'Launch', {
      title: 't',
      preheader: 'p',
      content: 'c',
    })
    expect(outcome.skipped).toBe(true)
  })

  it('records a suppression via upsert', async () => {
    const db = {
      emailSuppression: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue({}),
      },
    }
    const service = new EmailService(db as never)
    await service.suppressEmail('Person@Example.com')
    expect(db.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'person@example.com' } }),
    )
  })
})
