/**
 * #444 (Council P2-05): leakage defences — contact-exchange detection.
 *
 * The council premise is that contact details and the agency RIB are
 * exchanged at booking #1 BY DESIGN: the traveller needs the agency
 * bank instructions to pay it directly, and the departure pack shows
 * the agency emergency contact. Nothing here tries to prevent that.
 *
 * What is NOT by design is exchanging contacts BEFORE any booking
 * exists: a traveller and an agency that move to phone / WhatsApp /
 * direct bank transfer before booking #1 never create a booking at
 * all, so no platform service fee can ever be captured on the trip.
 * This detector is the detection half of the defence (the value half
 * is the rebooking surface, see bookings/rebooking.service.ts): it
 * recognises contact-exchange patterns in a message so the caller can
 * warn the sender and record a fee-capture signal.
 *
 * Precision rules (a false flag accuses an honest user, so the
 * detector is deliberately conservative):
 * - Only strong shapes match: full Moroccan mobile numbers (local or
 *   +212 form), e-mail addresses, IBANs / 24-digit Moroccan RIBs, and
 *   URLs (messaging/social domains, or any non-Ouiboo link).
 * - Bare words never match: the word whatsapp, call me, a first name,
 *   a price (2000 MAD for 2 people), a date, or a seat count produce
 *   no category.
 * - Ouiboo own links never match: sharing a trip page is a supported,
 *   encouraged flow, not leakage.
 * - Obfuscated spellings (spelled-out digits, name at gmail dot com)
 *   are NOT detected — a documented limitation, accepted so ordinary
 *   conversation is never flagged.
 *
 * The detector returns CATEGORIES ONLY. Callers must never persist
 * the matched text: an audit row records that a category was seen,
 * never what the traveller or agency actually wrote.
 */

export const CONTACT_EXCHANGE_AUDIT_ACTION =
  'MESSAGE_CONTACT_EXCHANGE_DETECTED';

export type ContactExchangeCategory =
  | 'PHONE'
  | 'EMAIL'
  | 'BANK_DETAILS'
  | 'EXTERNAL_CONTACT_LINK'
  | 'EXTERNAL_LINK';

/** Stable reporting order for categories. */
const CATEGORY_ORDER: ContactExchangeCategory[] = [
  'PHONE',
  'EMAIL',
  'BANK_DETAILS',
  'EXTERNAL_CONTACT_LINK',
  'EXTERNAL_LINK',
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

/** IBAN: 2-letter country, 2 check digits, 11-30 further alphanumerics. */
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{3,4}){3,7}\b/;

/** Hosts whose links exist to move the conversation off-platform. */
const CONTACT_HOSTS = new Set([
  'wa.me',
  'whatsapp.com',
  'api.whatsapp.com',
  'chat.whatsapp.com',
  't.me',
  'telegram.me',
  'm.me',
  'instagram.com',
  'facebook.com',
  'fb.com',
  'snapchat.com',
  'discord.gg',
]);

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>'"]+|\b[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s<>'"]*)/gi;

function isOuibooHost(host: string): boolean {
  return host === 'ouiboo.com' || host.endsWith('.ouiboo.com');
}

/**
 * Scan digit runs (digits possibly separated by spaces, dots, dashes
 * or parentheses) and classify the strong shapes:
 * - 20+ digits: a bank account number (a Moroccan RIB is 24 digits,
 *   usually written in spaced groups).
 * - a Moroccan mobile: 0[5-7] + 8 digits, +212 / 00212 + [5-7] + 8.
 * - an international number explicitly written with a leading +.
 */
function scanDigitRuns(content: string, found: Set<ContactExchangeCategory>): void {
  const runs = content.match(/\+?\d[\d\s().-]*\d|\d/g) ?? [];
  for (const run of runs) {
    const digits = run.replace(/\D/g, '');
    if (digits.length >= 20) {
      found.add('BANK_DETAILS');
      continue;
    }
    // Moroccan mobile, local (10), +212 (12) or 00212 (14) digit forms.
    // Mobiles are 06/07; 05 numbers are landlines (an agency office
    // landline in a message is not a leakage shape).
    const moroccanMobile =
      /^0[6-7]\d{8}$/.test(digits) ||
      /^212[6-7]\d{8}$/.test(digits) ||
      /^00212[6-7]\d{8}$/.test(digits);
    if (moroccanMobile) {
      found.add('PHONE');
      continue;
    }
    // Any other explicitly international number: leading +, 10-15 digits.
    if (run.trimStart().startsWith('+') && digits.length >= 10 && digits.length <= 15) {
      found.add('PHONE');
    }
  }
}

export function detectContactExchange(
  content: string | null | undefined,
): ContactExchangeCategory[] {
  if (!content) return [];
  const found = new Set<ContactExchangeCategory>();

  if (EMAIL_PATTERN.test(content)) {
    found.add('EMAIL');
  }

  if (IBAN_PATTERN.test(content.toUpperCase())) {
    found.add('BANK_DETAILS');
  }

  scanDigitRuns(content, found);

  for (const match of content.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const host = raw
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[/?#]/)[0]
      .toLowerCase();
    if (!host || isOuibooHost(host)) continue;
    if (CONTACT_HOSTS.has(host) || CONTACT_HOSTS.has(`www.${host}`)) {
      found.add('EXTERNAL_CONTACT_LINK');
    } else {
      found.add('EXTERNAL_LINK');
    }
  }

  return CATEGORY_ORDER.filter((category) => found.has(category));
}
