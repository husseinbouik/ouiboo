import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * #1025 (A3): enum drift census. The Prisma schema is the single source
 * of truth for domain enums; packages/types/enums.ts is GENERATED from it
 * (packages/types/scripts/generate-enums.mjs). This test fails if the two
 * ever drift apart again — the failure mode that left NotificationType
 * missing REVIEW_RESPONSE in @ouiboo/types while the DB had it.
 */
const REPO_ROOT = join(__dirname, '../../../..');

function parsePrismaEnums(): Map<string, string[]> {
    const schema = readFileSync(
        join(REPO_ROOT, 'packages/database/prisma/schema.prisma'),
        'utf8',
    );
    const enums = new Map<string, string[]>();
    for (const match of schema.matchAll(/enum\s+(\w+)\s*\{([^}]*)\}/g)) {
        const values = match[2]
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'))
            .map((l) => l.split(/\s+/)[0]);
        enums.set(match[1], values);
    }
    return enums;
}

function parseTypesEnums(): Map<string, string[]> {
    const src = readFileSync(join(REPO_ROOT, 'packages/types/enums.ts'), 'utf8');
    const enums = new Map<string, string[]>();
    for (const match of src.matchAll(/export enum\s+(\w+)\s*\{([^}]*)\}/g)) {
        enums.set(match[1], [...match[2].matchAll(/=\s*"([^"]+)"/g)].map((m) => m[1]));
    }
    return enums;
}

describe('types enums census (#1025)', () => {
    const prisma = parsePrismaEnums();
    const types = parseTypesEnums();

    it('parses the full Prisma enum set', () => {
        expect(prisma.size).toBeGreaterThanOrEqual(52);
    });

    it('every Prisma enum exists in @ouiboo/types with identical values', () => {
        for (const [name, values] of prisma) {
            expect(types.has(name)).toBe(true);
            expect(new Set(types.get(name))).toEqual(new Set(values));
        }
    });

    it('@ouiboo/types declares no enum the Prisma schema does not have', () => {
        for (const name of types.keys()) {
            expect(prisma.has(name)).toBe(true);
        }
    });

    it('index.ts hand-declares no domain enum (PaymentProvider excepted — it is not a Prisma enum)', () => {
        const index = readFileSync(join(REPO_ROOT, 'packages/types/index.ts'), 'utf8');
        const hand = [...index.matchAll(/export enum\s+(\w+)/g)].map((m) => m[1]);
        expect(hand).toEqual(['PaymentProvider']);
    });
});
