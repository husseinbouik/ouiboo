// pages/api/subscribe.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import nodemailer from 'nodemailer';

// --- NEW HELPER FUNCTION TO GENERATE DYNAMIC EMAILS ---
// This keeps your main API route clean and focused.
const generateEmailHtml = (name: string, userType: string) => {
  let subject: string;
  let html: string;
  const officialWebsiteUrl = 'https://ouiboo.vercel.app/';

  if (userType === 'Agency') {
    subject = `Welcome aboard, ${name}. Your agency just unlocked its next chapter.`;
    html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @media screen and (max-width: 600px) {
          .content-width { width: 100% !important; }
        }
      </style>
    </head>

    <body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#F9FAFB;">

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:24px;">

            <table class="content-width" width="600" cellpadding="0" cellspacing="0" border="0" 
              style="background:#ffffff; border-radius:14px; border:1px solid #e5e7eb; overflow:hidden;">

              <!-- HEADER -->
              <tr>
                <td align="center" style="background:#1E3A8A; padding:36px 20px;">
                  <h1 style="margin:0; font-size:34px; font-weight:800; letter-spacing:0.5px;">
                    <span style="color:#fff;">oui</span><span style="color:#0EA5E9;">boo</span>
                  </h1>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding:42px 34px;">

                  <h2 style="font-size:26px; color:#1E3A8A; font-weight:700; text-align:center; margin-top:0;">
                    A smarter, faster agency starts here.
                  </h2>

                  <p style="font-size:17px; color:#374151; text-align:center; line-height:1.6;">
                    Hi ${name}, welcome to Ouiboo. You've secured priority access to a platform designed 
                    to reduce operational friction and accelerate your agency’s growth.
                  </p>

                  <div style="margin-top:32px; padding:22px; background:#F9FAFB; border-radius:10px;">
                    <p style="font-size:16px; color:#1E3A8A; font-weight:600; margin:0 0 12px 0;">
                      What this means for your team:
                    </p>
                    <p style="margin:8px 0; font-size:16px; color:#374151;">🚀 A unified dashboard for trips, bookings, and payments.</p>
                    <p style="margin:8px 0; font-size:16px; color:#374151;">📊 Analytics that highlight trends and uncover revenue opportunities.</p>
                    <p style="margin:8px 0; font-size:16px; color:#374151;">🌍 Instant visibility inside a curated marketplace of global travelers.</p>
                  </div>

                  <!-- CTA -->
                  <div style="text-align:center; margin-top:40px;">
                    <a href="${officialWebsiteUrl}"
                      style="background:#0EA5E9; padding:16px 40px; color:#fff; border-radius:8px; 
                      text-decoration:none; font-weight:600; font-size:17px;">
                      Discover the Vision
                    </a>
                  </div>

                  <p style="margin-top:32px; font-size:14px; color:#6B7280; text-align:center;">
                    Have a question? Just reply — we read every message.
                  </p>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:20px; background:#F9FAFB; font-size:12px; color:#6B7280;">
                  Your early access link is on its way.
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
    `;
  }   else {
    subject = `${name}, your next adventure starts here. ✈️`;
    html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @media screen and (max-width: 600px) {
          .content-width { width: 100% !important; }
        }
      </style>
    </head>

    <body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#F9FAFB;">

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:24px;">

            <table class="content-width" width="600" cellpadding="0" cellspacing="0" border="0" 
              style="background:#ffffff; border-radius:14px; border:1px solid #e5e7eb; overflow:hidden;">

              <!-- HEADER -->
              <tr>
                <td align="center" style="padding:32px; border-bottom:4px solid #FACC15;">
                  <h1 style="margin:0; font-size:34px; font-weight:800;">
                    <span style="color:#1E3A8A;">oui</span><span style="color:#F97316;">boo</span>
                  </h1>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding:42px 34px;">

                  <h2 style="font-size:26px; color:#1E3A8A; font-weight:700; text-align:center; margin-top:0;">
                    Travel that finally feels personal.
                  </h2>

                  <p style="font-size:17px; color:#374151; text-align:center; line-height:1.6;">
                    Hey ${name}, thanks for joining the Ouiboo waitlist. You're getting closer to authentic travel 
                    experiences crafted by real local agencies — not mass-produced tours.
                  </p>

                  <div style="margin:30px 0; padding:24px 0; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; text-align:center;">
                    <p style="font-size:17px; color:#1E3A8A; margin:0; line-height:1.6;">
                      We curate the best independent agencies so you can skip the tourist traps and explore the world like a local.
                    </p>
                  </div>

                  <p style="font-size:17px; color:#374151; text-align:center; line-height:1.6;">
                    Your next story is waiting. We’ll help you write it.
                  </p>

                  <!-- CTA -->
                  <div style="text-align:center; margin-top:40px;">
                    <a href="${officialWebsiteUrl}"
                      style="background:#F97316; padding:16px 40px; color:#fff; border-radius:8px; 
                      text-decoration:none; font-weight:600; font-size:17px;">
                      See What’s Coming
                    </a>
                  </div>

                  <p style="margin-top:32px; font-size:14px; color:#6B7280; text-align:center;">
                    Have questions or ideas? Reply anytime — we read everything.
                  </p>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:20px; background:#F9FAFB; font-size:12px; color:#6B7280;">
                  Your early access pass is on its way.
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
    `;
  }

  return { subject, html };
};




export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, userType, phoneNumber, agencyName } = body;
    
    if (!name || !email || !userType || !phoneNumber) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Generate the customized email based on user type
    const { subject, html } = generateEmailHtml(name, userType);

    // Configure the "transporter" with your Gmail credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Define the email options with the dynamic subject and HTML
    const mailOptions = {
      from: `"Ouiboo" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: subject,
      html: html,
    };

    // Send the email and save to Google Sheets concurrently
    await Promise.all([
        transporter.sendMail(mailOptions),
        (async () => {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            const sheets = google.sheets({ auth, version: 'v4' });
            const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            const newRow = [name, email, phoneNumber, userType, agencyName || '', timestamp];
            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [newRow] },
            });
        })()
    ]);

    return NextResponse.json({ message: 'Success!' }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}