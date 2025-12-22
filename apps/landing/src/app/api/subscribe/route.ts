// pages/api/subscribe.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import nodemailer from 'nodemailer';

// --- NEW HELPER FUNCTION TO GENERATE DYNAMIC EMAILS ---
// This keeps your main API route clean and focused.
// Supports multiple languages: en, fr, ar
const generateEmailHtml = (name: string, userType: string, language: string = 'en') => {
  let subject: string;
  let html: string;
  const officialWebsiteUrl = 'https://ouiboo.vercel.app/';

  // Normalize language code
  const lang = ['en', 'fr', 'ar'].includes(language) ? language : 'en';
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';
  const fontFamily = isRTL
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // Email content based on language and user type
  const content: Record<string, Record<string, any>> = {
    en: {
      agency: {
        subject: `Welcome aboard, ${name}. Your agency just unlocked its next chapter.`,
        title: "A smarter, faster agency starts here.",
        greeting: `Hi ${name}, welcome to Ouiboo. You've secured priority access to a platform designed to reduce operational friction and accelerate your agency's growth.`,
        featuresTitle: "What this means for your team:",
        features: [
          "🚀 A unified dashboard for trips, bookings, and payments.",
          "📊 Analytics that highlight trends and uncover revenue opportunities.",
          "🌍 Instant visibility inside a curated marketplace of global travelers."
        ],
        cta: "Discover the Vision",
        footer: "Have a question? Just reply — we read every message.",
        footerBottom: "Your early access link is on its way."
      },
      traveler: {
        subject: `${name}, your next adventure starts here. ✈️`,
        title: "Travel that finally feels personal.",
        greeting: `Hey ${name}, thanks for joining the Ouiboo waitlist. You're getting closer to authentic travel experiences crafted by real local agencies — not mass-produced tours.`,
        highlight: "We curate the best independent agencies so you can skip the tourist traps and explore the world like a local.",
        closing: "Your next story is waiting. We'll help you write it.",
        cta: "See What's Coming",
        footer: "Have questions or ideas? Reply anytime — we read everything.",
        footerBottom: "Your early access pass is on its way."
      }
    },
    fr: {
      agency: {
        subject: `Bienvenue à bord, ${name}. Votre agence vient de débloquer son prochain chapitre.`,
        title: "Une agence plus intelligente et plus rapide commence ici.",
        greeting: `Bonjour ${name}, bienvenue sur Ouiboo. Vous avez obtenu un accès prioritaire à une plateforme conçue pour réduire les frictions opérationnelles et accélérer la croissance de votre agence.`,
        featuresTitle: "Ce que cela signifie pour votre équipe :",
        features: [
          "🚀 Un tableau de bord unifié pour les voyages, réservations et paiements.",
          "📊 Des analyses qui mettent en évidence les tendances et révèlent des opportunités de revenus.",
          "🌍 Une visibilité instantanée dans une place de marché sélectionnée de voyageurs internationaux."
        ],
        cta: "Découvrir la Vision",
        footer: "Une question ? Répondez simplement — nous lisons chaque message.",
        footerBottom: "Votre lien d'accès anticipé arrive bientôt."
      },
      traveler: {
        subject: `${name}, votre prochaine aventure commence ici. ✈️`,
        title: "Un voyage qui se sent enfin personnel.",
        greeting: `Salut ${name}, merci d'avoir rejoint la liste d'attente Ouiboo. Vous vous rapprochez d'expériences de voyage authentiques créées par de vraies agences locales — pas de circuits produits en masse.`,
        highlight: "Nous sélectionnons les meilleures agences indépendantes pour que vous puissiez éviter les pièges à touristes et explorer le monde comme un local.",
        closing: "Votre prochaine histoire vous attend. Nous vous aiderons à l'écrire.",
        cta: "Voir ce qui arrive",
        footer: "Des questions ou des idées ? Répondez à tout moment — nous lisons tout.",
        footerBottom: "Votre passe d'accès anticipé arrive bientôt."
      }
    },
    ar: {
      agency: {
        subject: `مرحباً بك، ${name}. وكالتك فتحت للتو فصلها التالي.`,
        title: "وكالة أذكى وأسرع تبدأ من هنا.",
        greeting: `مرحباً ${name}، أهلاً بك في Ouiboo. لقد حصلت على وصول ذو أولوية لمنصة مصممة لتقليل الاحتكاك التشغيلي وتسريع نمو وكالتك.`,
        featuresTitle: "ما يعنيه هذا لفريقك:",
        features: [
          "🚀 لوحة تحكم موحدة للرحلات والحجوزات والمدفوعات.",
          "📊 تحليلات تسلط الضوء على الاتجاهات وتكشف فرص الإيرادات.",
          "🌍 رؤية فورية داخل سوق منسق من المسافرين العالميين."
        ],
        cta: "اكتشف الرؤية",
        footer: "لديك سؤال؟ فقط رد — نقرأ كل رسالة.",
        footerBottom: "رابط الوصول المبكر في طريقه إليك."
      },
      traveler: {
        subject: `${name}، مغامرتك القادمة تبدأ من هنا. ✈️`,
        title: "سفر يشعر أخيراً بأنه شخصي.",
        greeting: `مرحباً ${name}، شكراً لانضمامك إلى قائمة انتظار Ouiboo. أنت تقترب من تجارب سفر أصيلة من صنع وكالات محلية حقيقية — وليست جولات منتجة بكميات كبيرة.`,
        highlight: "نحن نختار أفضل الوكالات المستقلة حتى تتمكن من تخطي فخاخ السياح واستكشاف العالم مثل السكان المحليين.",
        closing: "قصتك التالية في انتظارك. سنساعدك على كتابتها.",
        cta: "شاهد ما قادم",
        footer: "لديك أسئلة أو أفكار؟ رد في أي وقت — نقرأ كل شيء.",
        footerBottom: "بطاقة الوصول المبكر في طريقها إليك."
      }
    }
  };

  const emailContent = content[lang][userType === 'Agency' ? 'agency' : 'traveler'];

  if (userType === 'Agency') {
    subject = emailContent.subject;
    html = `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${dir}">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @media screen and (max-width: 600px) {
          .content-width { width: 100% !important; }
        }
      </style>
    </head>

    <body style="margin:0; padding:0; font-family:${fontFamily}; background:#F9FAFB;">

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
                <td style="padding:42px 34px; direction:${dir}; text-align:${textAlign};">

                  <h2 style="font-size:26px; color:#1E3A8A; font-weight:700; text-align:center; margin-top:0;">
                    ${emailContent.title}
                  </h2>

                  <p style="font-size:17px; color:#374151; text-align:center; line-height:1.6;">
                    ${emailContent.greeting}
                  </p>

                  <div style="margin-top:32px; padding:22px; background:#F9FAFB; border-radius:10px;">
                    <p style="font-size:16px; color:#1E3A8A; font-weight:600; margin:0 0 12px 0;">
                      ${emailContent.featuresTitle}
                    </p>
                    ${emailContent.features.map((feature: string) => `<p style="margin:8px 0; font-size:16px; color:#374151;">${feature}</p>`).join('')}
                  </div>

                  <!-- CTA -->
                  <div style="text-align:center; margin-top:40px;">
                    <a href="${officialWebsiteUrl}"
                      style="background:#0EA5E9; padding:16px 40px; color:#fff; border-radius:8px; 
                      text-decoration:none; font-weight:600; font-size:17px; display:inline-block;">
                      ${emailContent.cta}
                    </a>
                  </div>

                  <p style="margin-top:32px; font-size:14px; color:#6B7280; text-align:center;">
                    ${emailContent.footer}
                  </p>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:20px; background:#F9FAFB; font-size:12px; color:#6B7280;">
                  ${emailContent.footerBottom}
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
    `;
  } else {
    subject = emailContent.subject;
    html = `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${dir}">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @media screen and (max-width: 600px) {
          .content-width { width: 100% !important; }
        }
      </style>
    </head>

    <body style="margin:0; padding:0; font-family:${fontFamily}; background:#F9FAFB;">

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
                <td style="padding:42px 34px; direction:${dir}; text-align:${textAlign};">

                  <h2 style="font-size:26px; color:#1E3A8A; font-weight:700; text-align:center; margin-top:0;">
                    ${emailContent.title}
                  </h2>

                  <p style="font-size:17px; color:#374151; text-align:center; line-height:1.6;">
                    ${emailContent.greeting}
                  </p>

                  <div style="margin:30px 0; padding:24px 0; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; text-align:center;">
                    <p style="font-size:17px; color:#1E3A8A; margin:0; line-height:1.6;">
                      ${emailContent.highlight}
                    </p>
                  </div>

                  <p style="font-size:17px; color:#374151; text-align:center; line-height:1.6;">
                    ${emailContent.closing}
                  </p>

                  <!-- CTA -->
                  <div style="text-align:center; margin-top:40px;">
                    <a href="${officialWebsiteUrl}"
                      style="background:#F97316; padding:16px 40px; color:#fff; border-radius:8px; 
                      text-decoration:none; font-weight:600; font-size:17px; display:inline-block;">
                      ${emailContent.cta}
                    </a>
                  </div>

                  <p style="margin-top:32px; font-size:14px; color:#6B7280; text-align:center;">
                    ${emailContent.footer}
                  </p>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:20px; background:#F9FAFB; font-size:12px; color:#6B7280;">
                  ${emailContent.footerBottom}
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
    const { name, email, userType, phoneNumber, agencyName, language } = body;

    // 1. Basic Validation
    if (!name || !email || !userType || !phoneNumber) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // 2. Environment Variable Validation
    const requiredEnvVars = [
      'GMAIL_EMAIL',
      'GMAIL_APP_PASSWORD',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_SHEET_ID'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
      console.error('Missing Environment Variables:', missingEnvVars);
      return NextResponse.json({
        message: 'Server configuration error',
        details: `Missing: ${missingEnvVars.join(', ')}`
      }, { status: 500 });
    }

    // 3. Generate the customized email
    const { subject, html } = generateEmailHtml(name, userType, language || 'en');

    // 4. Execute Tasks
    const results = await Promise.allSettled([
      // Task A: Send Email
      (async () => {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_EMAIL,
              pass: process.env.GMAIL_APP_PASSWORD,
            },
          });

          await transporter.sendMail({
            from: `"Ouiboo" <${process.env.GMAIL_EMAIL}>`,
            to: email,
            subject: subject,
            html: html,
          });
          return { task: 'email', status: 'success' };
        } catch (err: any) {
          console.error('Email Error:', err.message);
          throw new Error(`Email failed: ${err.message}`);
        }
      })(),

      // Task B: Save to Google Sheets
      (async () => {
        try {
          const auth = new google.auth.GoogleAuth({
            credentials: {
              client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
              private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });

          const sheets = google.sheets({ auth, version: 'v4' });
          const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
          const newRow = [name, email, phoneNumber, userType, agencyName || '', timestamp, language || 'en'];

          await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:G', // Explicit range with sheet name
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [newRow] },
          });
          return { task: 'sheets', status: 'success' };
        } catch (err: any) {
          console.error('Sheets Error:', err.message);
          throw new Error(`Sheets failed: ${err.message}`);
        }
      })()
    ]);

    // Check results
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      const errors = failures.map(f => (f as PromiseRejectedResult).reason.message);
      console.error('Partial API Failure:', errors);
      // We still return 200 if at least one succeeded, or 500 if critical ones failed?
      // Usually, if email fails, it's a "fallback" error.
      return NextResponse.json({
        message: 'Partial success',
        errors
      }, { status: 207 });
    }

    return NextResponse.json({ message: 'Success!' }, { status: 200 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}