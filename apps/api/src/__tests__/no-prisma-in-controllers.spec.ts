import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * #1024 (A2): controllers are thin HTTP layers — business logic and direct
 * Prisma access live in services. This arch test fails if any controller
 * injects or references DatabaseService again.
 *
 * Single documented exception: health.controller.ts, whose whole job is the
 * infrastructure liveness/readiness probe (`SELECT 1`) — it holds no
 * business logic and no entity queries.
 */
const SRC_ROOT = join(__dirname, '..');
const ALLOWED = new Set(['health/health.controller.ts']);

function collectControllers(dir: string, base: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = base ? `${base}/${entry}` : entry;
        if (statSync(full).isDirectory()) {
            out.push(...collectControllers(full, rel));
        } else if (entry.endsWith('.controller.ts')) {
            out.push(rel);
        }
    }
    return out;
}

describe('architecture: no DatabaseService in controllers (#1024)', () => {
    it('no *.controller.ts injects DatabaseService (health probe excepted)', () => {
        const offenders: string[] = [];
        for (const rel of collectControllers(SRC_ROOT, '')) {
            if (ALLOWED.has(rel)) continue;
            const content = readFileSync(join(SRC_ROOT, rel), 'utf8');
            if (/DatabaseService/.test(content)) offenders.push(rel);
        }
        expect(offenders).toEqual([]);
    });

    it('the extracted controllers stay thin (no prisma/db field access)', () => {
        for (const rel of [
            'agency/agency.controller.ts',
            'agency/agency-public.controller.ts',
            'admin/admin.controller.ts',
        ]) {
            const content = readFileSync(join(SRC_ROOT, rel), 'utf8');
            expect(content).not.toMatch(/this\.(prisma|db)\./);
        }
    });
});
