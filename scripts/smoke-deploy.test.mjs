import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUrl } from './smoke-deploy.mjs';

test('normalizes an API origin without a prefix', () => {
  assert.equal(
    normalizeUrl('https://api.example.com', '/api/v1/health/ready'),
    'https://api.example.com/api/v1/health/ready',
  );
});

test('does not duplicate an existing API prefix', () => {
  assert.equal(
    normalizeUrl('https://api.example.com/api/v1', '/api/v1/health/ready'),
    'https://api.example.com/api/v1/health/ready',
  );
});

test('preserves a frontend base path', () => {
  assert.equal(
    normalizeUrl('https://example.com/traveler/', '/api/health'),
    'https://example.com/traveler/api/health',
  );
});
