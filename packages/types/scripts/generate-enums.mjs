/**
 * #1025 (A3): generate packages/types/enums.ts from the Prisma schema.
 *
 * The Prisma schema (packages/database/prisma/schema.prisma) is the single
 * source of truth for domain enums. This script regenerates the TypeScript
 * mirror in @ouiboo/types so API and frontends stop hand-syncing copies.
 *
 * Usage: node packages/types/scripts/generate-enums.mjs
 * Drift is caught in CI by apps/api/src/__tests__/types-enums-census.spec.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '../../database/prisma/schema.prisma');
const outPath = join(here, '../enums.ts');

const schema = readFileSync(schemaPath, 'utf8');

// Member names are PascalCase conversions of the Prisma values, except
// where the historical hand-written enum used semantic member names.
const MEMBER_OVERRIDES = {
    TravelLicenceType: { ODV: 'FullOperator', DV: 'SalesOnly' },
};

const DOC_COMMENTS = {
    BankDetailsStatus:
        "// #421 (Council P0-19): lifecycle of an agency's bank payment destination.\n" +
        '// Submitted details sit in pending fields until an admin verifies them\n' +
        '// against the bank attestation; only VERIFIED details are traveller-live.',
    ManualPaymentChannel:
        '/** #988: which manual channel a traveller chose — bank transfer or\n' +
        ' * Cash Plus. Both are MANUAL (traveller pays the agency directly). */',
};

const pascal = (value) =>
    value
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');

const enums = [];
for (const match of schema.matchAll(/enum\s+(\w+)\s*\{([^}]*)\}/g)) {
    const [, name, body] = match;
    const values = body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'))
        .map((l) => l.split(/\s+/)[0]);
    enums.push({ name, values });
}

if (enums.length === 0) {
    console.error('No enums parsed from schema — aborting.');
    process.exit(1);
}

let out = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source of truth: packages/database/prisma/schema.prisma (domain enums).
 * Regenerate with: node packages/types/scripts/generate-enums.mjs
 * (#1025 / finding A3: single source of truth for enums.)
 */

`;
for (const { name, values } of enums) {
    if (DOC_COMMENTS[name]) out += `${DOC_COMMENTS[name]}\n`;
    out += `export enum ${name} {\n`;
    for (const value of values) {
        const member = MEMBER_OVERRIDES[name]?.[value] ?? pascal(value);
        out += `    ${member} = "${value}",\n`;
    }
    out += `}\n\nexport type ${name}Type = ${name};\n\n`;
}

writeFileSync(outPath, out.trimEnd() + '\n');
console.log(`Wrote ${outPath} with ${enums.length} enums.`);
