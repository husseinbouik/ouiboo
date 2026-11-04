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


/** Final logo (V1+W3, #794): the on-light primary lockup, inlined — this
 * public confirmation page previously typeset a wordmark in an off-palette
 * orange (#F26B38). Geometry verbatim from the logo masters
 * (files/logo-final-2026-11-04), sized 142x40. */
const UNSUBSCRIBE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 427 120" width="142" height="40"><g><path d="M 86.41 54.39 A 27.0 27.0 0 1 1 41.24 40.58" fill="none" stroke="#0A192F" stroke-width="16.0" stroke-linecap="butt"/><path d="M 44.13 38.16 A 27.0 27.0 0 0 1 68.34 34.32" fill="none" stroke="#FF6B35" stroke-width="16.0" stroke-linecap="butt"/><circle cx="80.68" cy="42.64" r="8.5" fill="#FF6B35"/></g><g transform="translate(144 0)"><circle cx="29.16" cy="67.58" r="19.51" fill="none" stroke="#0A192F" stroke-width="13.82"/><g transform="translate(58.33 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M613 558V0H442V76Q416 39 371.5 16.5Q327 -6 273 -6Q209 -6 160.0 22.5Q111 51 84.0 105.0Q57 159 57 232V558H227V255Q227 199 256.0 168.0Q285 137 334 137Q384 137 413.0 168.0Q442 199 442 255V558Z" fill="#0A192F"/></g><g transform="translate(108.34 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M46 708Q46 748 74.5 774.5Q103 801 148 801Q192 801 220.5 774.5Q249 748 249 708Q249 669 220.5 642.5Q192 616 148 616Q103 616 74.5 642.5Q46 669 46 708Z" fill="#FF6B35"/></g><g transform="translate(108.34 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M233 558V0H62V558Z" fill="#0A192F"/></g><g transform="translate(130.23 94.0) scale(0.07420494699646643 -0.07420494699646643)"><path d="M405 566Q474 566 530.0 531.0Q586 496 618.5 431.0Q651 366 651 280Q651 194 618.5 128.5Q586 63 530.0 27.5Q474 -8 405 -8Q346 -8 302.0 15.5Q258 39 233 78V0H62V740H233V479Q257 518 302.0 542.0Q347 566 405 566ZM354 417Q303 417 267.5 380.0Q232 343 232 279Q232 215 267.5 178.0Q303 141 354 141Q405 141 441.0 178.5Q477 216 477 280Q477 344 441.5 380.5Q406 417 354 417Z" fill="#0A192F"/></g><circle cx="204.25" cy="72.70" r="15.81" fill="none" stroke="#0A192F" stroke-width="10.98"/><circle cx="251.52" cy="72.70" r="15.81" fill="none" stroke="#0A192F" stroke-width="10.98"/></g></svg>`

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
      <div>${UNSUBSCRIBE_LOGO_SVG}</div>
      <p style="font-size:16px;line-height:1.6;color:${color};">${escapeHtml(message)}</p>
    </main>
  </body>
</html>`
}
