import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

test('native shell passes structural validation', () => {
  const output = execFileSync(
    process.execPath,
    [path.join(root, 'scripts/validate-shell.mjs')],
    { cwd: root, encoding: 'utf8' },
  );
  assert.match(output, /Native shell validation passed\./);
});

test('shell is a remote wrapper, not a second copy of the web app', () => {
  const config = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
  assert.match(config, /url: 'https:\/\/ouiboo-traveler-staging\.vercel\.app'/);
  assert.match(config, /cleartext: false/);
  const fallback = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
  assert.match(fallback, /<title>Ouiboo<\/title>/);
});

test('no signing material or store secrets are committed', () => {
  const banned = [/\.keystore$/, /\.jks$/, /\.p12$/, /\.mobileprovision$/, /\.pem$/];
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === 'node_modules') return [];
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  for (const file of walk(root)) {
    assert.ok(
      !banned.some((pattern) => pattern.test(file)),
      `signing file must never be committed: ${file}`,
    );
  }
});
