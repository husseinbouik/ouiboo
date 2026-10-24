// Phase 1 terminology guard (issue #372, plan §58).
//
// OuiBoo is a technology provider: agencies sell the trips and receive
// traveller payments directly (or via their own payment provider). OuiBoo
// does NOT hold traveller money, does NOT escrow funds, does NOT guarantee
// refunds in Phase 1, and its fee is a "platform service fee" — never a
// "commission" in user-facing copy.
//
// This script scans the VALUES of every app locale file (the shipped
// user-facing copy in en/fr/ar) and fails if custody/commission language
// returns. Code identifiers, keys, env vars and API contracts are out of
// scope — only rendered copy is checked.
//
// Honest negations stay allowed: e.g. "OuiBoo never holds traveller money,
// so there is no OuiBoo balance to withdraw" contains none of the banned
// phrases below.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LOCALE_FILES = [];
for (const app of ['traveler', 'agency', 'admin', 'landing']) {
  for (const locale of ['en', 'fr', 'ar']) {
    LOCALE_FILES.push(path.join(ROOT, 'apps', app, 'public', 'locales', locale, 'translation.json'));
  }
}

// Banned in user-facing copy values. Word boundaries use unicode letter
// lookarounds so e.g. fr "téléversement" (upload) does not match
// "versement" (payout).
const BANNED = [
  { pattern: /(?<![\p{L}])commission(?![\p{L}])/iu, label: '"commission" (use "platform service fee")' },
  { pattern: /عمولة/, label: '"عمولة" (use "رسوم خدمة المنصة")' },
  { pattern: /(?<![\p{L}])escrow(?![\p{L}])/iu, label: '"escrow"' },
  { pattern: /(?<![\p{L}])wallet(?![\p{L}])/iu, label: '"wallet" (OuiBoo holds no balance)' },
  { pattern: /(?<![\p{L}])portefeuille(?![\p{L}])/iu, label: '"portefeuille" (OuiBoo holds no balance)' },
  { pattern: /محفظة/, label: '"محفظة" (OuiBoo holds no balance)' },
  { pattern: /(?<![\p{L}])payouts?(?![\p{L}])/iu, label: '"payout" (payments go directly to the agency)' },
  { pattern: /(?<![\p{L}])versements?(?![\p{L}])/iu, label: '"versement" (payments go directly to the agency)' },
  { pattern: /available balance/iu, label: '"available balance"' },
  { pattern: /solde disponible/iu, label: '"solde disponible"' },
  { pattern: /الرصيد المتاح/, label: '"الرصيد المتاح"' },
  { pattern: /(?<![\p{L}])withdrawals?(?![\p{L}])/iu, label: '"withdrawal"' },
  { pattern: /limites de retrait/iu, label: '"limites de retrait"' },
  { pattern: /حدود سحب/, label: '"حدود سحب"' },
  { pattern: /guaranteed refund|refund guaranteed/iu, label: 'guaranteed-refund claim' },
  { pattern: /remboursement garanti/iu, label: 'guaranteed-refund claim' },
  { pattern: /استرداد مضمون/, label: 'guaranteed-refund claim' },
  { pattern: /funds held by ouiboo|ouiboo holds your|held securely in your ouiboo/iu, label: 'OuiBoo custody claim' },
];

function walk(obj, keyPath, visit) {
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      walk(value, keyPath ? `${keyPath}.${key}` : key, visit);
    }
  } else if (typeof obj === 'string') {
    visit(keyPath, obj);
  }
}

const failures = [];
for (const file of LOCALE_FILES) {
  const rel = path.relative(ROOT, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`${rel}: invalid JSON (${error.message})`);
    continue;
  }
  walk(data, '', (keyPath, value) => {
    for (const { pattern, label } of BANNED) {
      if (pattern.test(value)) {
        failures.push(`${rel} :: ${keyPath} :: banned ${label} in ${JSON.stringify(value)}`);
      }
    }
  });
}

if (failures.length > 0) {
  console.error('Phase 1 terminology check FAILED — user-facing copy must not imply OuiBoo holds traveller funds or charges a "commission":');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Phase 1 terminology check passed (${LOCALE_FILES.length} locale files scanned).`);
