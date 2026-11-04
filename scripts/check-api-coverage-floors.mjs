#!/usr/bin/env node
/**
 * Per-module API coverage floor enforcement (issue #643).
 *
 * Jest's coverageThreshold glob keys apply per FILE, not per directory,
 * so the per-module floors for the critical modules (payments, bookings,
 * auth, messages) are enforced here from the aggregate numbers in the
 * jest json-summary report. The GLOBAL floor is enforced by jest itself
 * via apps/api/package.json `jest.coverageThreshold`.
 *
 * Usage:
 *   node scripts/check-api-coverage-floors.mjs [summaryPath] [floorsPath]
 * Defaults: apps/api/coverage/coverage-summary.json + apps/api/coverage-floors.json
 *
 * Exit 0 = every module at/above its floor. Exit 1 = at least one module
 * below its floor (or the report/floors file is unusable).
 * Ratchet rule: floors in coverage-floors.json may only move UP.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const summaryPath = process.argv[2] || resolve(root, 'apps/api/coverage/coverage-summary.json');
const floorsPath = process.argv[3] || resolve(root, 'apps/api/coverage-floors.json');

const METRICS = ['lines', 'statements', 'branches', 'functions'];

let summary, floors;
try {
  summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  floors = JSON.parse(readFileSync(floorsPath, 'utf8'));
} catch (e) {
  console.error(`coverage-floors: cannot read inputs: ${e.message}`);
  process.exit(1);
}

// Aggregate covered/total per top-level module directory under apps/api/src.
const modules = new Map();
for (const [path, data] of Object.entries(summary)) {
  if (path === 'total') continue;
  const marker = '/apps/api/src/';
  const idx = path.indexOf(marker);
  if (idx === -1) continue;
  const mod = path.slice(idx + marker.length).split('/')[0];
  if (!modules.has(mod)) {
    modules.set(mod, Object.fromEntries(METRICS.map((m) => [m, { covered: 0, total: 0 }])));
  }
  const agg = modules.get(mod);
  for (const m of METRICS) {
    agg[m].covered += data[m].covered;
    agg[m].total += data[m].total;
  }
}

let failed = false;
for (const [mod, floor] of Object.entries(floors)) {
  if (mod.startsWith('_')) continue;
  const agg = modules.get(mod);
  if (!agg) {
    console.error(`coverage-floors: module "${mod}" not found in coverage report`);
    failed = true;
    continue;
  }
  for (const m of METRICS) {
    const pct = agg[m].total === 0 ? 100 : (agg[m].covered / agg[m].total) * 100;
    const ok = pct >= floor[m];
    if (!ok) failed = true;
    console.log(
      `coverage-floors: ${mod} ${m} ${pct.toFixed(2)}% vs floor ${floor[m]}% — ${ok ? 'OK' : 'BELOW FLOOR'}`,
    );
  }
}

if (failed) {
  console.error('coverage-floors: FAILED — a critical module dropped below its floor (#643 ratchet).');
  process.exit(1);
}
console.log('coverage-floors: all per-module floors satisfied.');
