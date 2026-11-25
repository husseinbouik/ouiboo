/**
 * #1027 (F2): traveller home bundle budget gate.
 *
 * The home page's first-load JS drifted to 616 KB against a 600 KB cap
 * with nothing in CI to stop it. This script makes the cap enforced:
 * it boots the production build (`next start`), fetches `/`, collects
 * every JS chunk the HTML actually ships for first load, and fails
 * when their GZIPPED total exceeds the budget. Measuring the served
 * HTML keeps the gate honest across bundler changes (this Next
 * version's manifests carry no per-page chunk list).
 *
 * Usage: node scripts/check-bundle-budget.mjs [budgetKB]
 * Run after `next build`. Wired into CI (ci.yml build job).
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = join(appDir, '.next');
const budgetKB = Number(process.argv[2] ?? 600);
const budgetBytes = budgetKB * 1024;
const PORT = 3217;

if (!existsSync(join(nextDir, 'BUILD_ID'))) {
    console.error('No production build found in .next — run `next build` first.');
    process.exit(2);
}

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: appDir,
    stdio: 'ignore',
    env: process.env,
});

async function waitForServer(deadlineMs = 60_000) {
    const start = Date.now();
    for (;;) {
        try {
            // Loopback-only health check against the `next start` child
            // process spawned above — never leaves this machine, and the
            // local dev server speaks plain HTTP only.
            const res = await fetch(`http://127.0.0.1:${PORT}/`); // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
            return res;
        } catch {
            if (Date.now() - start > deadlineMs) throw new Error('server did not come up');
            await new Promise((r) => setTimeout(r, 500));
        }
    }
}

try {
    const res = await waitForServer();
    const html = await res.text();
    const srcs = [...html.matchAll(/<script[^>]+src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);
    const files = [...new Set(srcs)];

    if (files.length === 0) {
        console.error('No chunk scripts found in the home HTML — did the page render?');
        process.exit(2);
    }

    let total = 0;
    const rows = [];
    for (const src of files) {
        const path = join(nextDir, src.replace('/_next/', ''));
        if (!existsSync(path)) continue;
        const gz = gzipSync(readFileSync(path)).length;
        total += gz;
        rows.push([gz, src]);
    }
    rows.sort((a, b) => b[0] - a[0]);

    console.log(`Home (/) first-load JS — ${files.length} chunk files, budget ${budgetKB} KB (gzipped):`);
    for (const [gz, file] of rows.slice(0, 10)) {
        console.log(`  ${(gz / 1024).toFixed(1).padStart(7)} KB  ${file}`);
    }
    console.log(`  TOTAL: ${(total / 1024).toFixed(1)} KB`);

    if (total > budgetBytes) {
        console.error(`BUNDLE BUDGET EXCEEDED: home first-load JS is ${(total / 1024).toFixed(1)} KB > ${budgetKB} KB cap (#1027).`);
        process.exit(1);
    }
    console.log('Bundle budget OK.');
} finally {
    server.kill('SIGTERM');
}
