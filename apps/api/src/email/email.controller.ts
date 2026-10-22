import { Controller, Get, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { EmailService } from './email.service'
import { escapeHtml } from './email-template'

// Public, login-free unsubscribe endpoints for marketing email (#322).
// The signed token is the credential: an HMAC over the address, verified by
// EmailService. GET serves the link placed in email footers; POST serves the
// RFC 8058 one-click flow advertised via the List-Unsubscribe-Post header.
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('unsubscribe')
  async unsubscribeViaLink(@Query('t') token: string, @Res() res: Response) {
    const email = this.emailService.verifyUnsubscribeToken(token || '')
    if (!email) {
      res
        .status(400)
        .type('html')
        .send(confirmationPage('This unsubscribe link is invalid.', false))
      return
    }
    await this.emailService.suppressEmail(email)
    res
      .status(200)
      .type('html')
      .send(
        confirmationPage(
          'You have been unsubscribed. You will no longer receive marketing emails from Ouiboo.',
          true,
        ),
      )
  }

  @Post('unsubscribe')
  async unsubscribeOneClick(@Query('t') token: string, @Res() res: Response) {
    const email = this.emailService.verifyUnsubscribeToken(token || '')
    if (!email) {
      res.status(400).json({ ok: false, error: 'Invalid unsubscribe token' })
      return
    }
    await this.emailService.suppressEmail(email)
    res.status(200).json({ ok: true })
  }
}

function confirmationPage(message: string, success: boolean): string {
  const color = success ? '#071B33' : '#B91C1C'
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Ouiboo - Unsubscribe</title>
  </head>
  <body style="margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#F4F7F9;color:#071B33;">
    <main style="max-width:520px;margin:64px auto;padding:32px;background:#FFFFFF;border:1px solid #DCE5EC;border-radius:16px;text-align:center;">
      <div style="font-size:24px;font-weight:900;">Oui<span style="color:#F26B38;">boo</span></div>
      <p style="font-size:16px;line-height:1.6;color:${color};">${escapeHtml(message)}</p>
    </main>
  </body>
</html>`
}
