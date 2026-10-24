#!/usr/bin/env node
/**
 * Merge the per-workspace Jest lcov reports into a single repo-root report
 * for SonarCloud (issue #365).
 *
 * Each workspace writes <workspace>/coverage/lcov.info with SF: paths
 * relative to that workspace (or its src/ root). Sonar resolves relative
 * SF: paths against the project base directory, so every entry is rewritten
 * to a repo-root-relative path (verified against the file system) before
 * concatenation into coverage/lcov.info, which sonar-project.properties
 * points both the JavaScript and TypeScript lcov settings at.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';

const root = process.cwd();
const suites = [
  'apps/api',
  'apps/traveler',
  'apps/agency',
  'apps/admin',
  'apps/landing',
  'packages/api-client',
  'packages/session',
];

function resolveSf(suiteDir, sf) {
  const clean = sf.split('\\').join('/');
  if (isAbsolute(clean)) {
    const rel = relative(root, clean).split('\\').join('/');
    return rel.startsWith('..') ? clean : rel;
  }
  // Try, in order: relative to the workspace, relative to its src/ root
  // (Jest rootDir for the API), and already repo-root relative.
  const candidates = [
    join(suiteDir, clean),
    join(suiteDir, 'src', clean),
    clean,
  ];
  for (const candidate of candidates) {
    if (existsSync(join(root, candidate))) {
      return candidate.split('\\').join('/');
    }
  }
  return join(suiteDir, clean).split('\\').join('/');
}

const merged = [];
let totalRecords = 0;
for (const suite of suites) {
  const reportPath = join(root, suite, 'coverage', 'lcov.info');
  if (!existsSync(reportPath)) {
    console.warn(`merge-lcov: no report for ${suite} (skipped)`);
    continue;
  }
  const lines = readFileSync(reportPath, 'utf8').split(/\r?\n/);
  let records = 0;
  for (const line of lines) {
    if (line.startsWith('SF:')) {
      merged.push(`SF:${resolveSf(suite, line.slice(3).trim())}`);
      records += 1;
    } else {
      merged.push(line);
    }
  }
  totalRecords += records;
  console.log(`merge-lcov: ${suite}: ${records} file records`);
}

if (totalRecords === 0) {
  console.error('merge-lcov: no coverage records found in any workspace report');
  process.exit(1);
}

const outPath = join(root, 'coverage', 'lcov.info');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, merged.join('\n').replace(/\n*$/, '\n'));
console.log(`merge-lcov: wrote ${outPath} with ${totalRecords} file records`);
