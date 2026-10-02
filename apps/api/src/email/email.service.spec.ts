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
