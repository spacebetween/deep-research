import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getObservabilityPolicy,
  normalizeClientId,
  summarizeText,
} from './policy';

test('enables observability by default in development and captures full message/result content', () => {
  const policy = getObservabilityPolicy({
    NODE_ENV: 'development',
  });

  assert.equal(policy.enabled, true);
  assert.equal(policy.captureMessages, 'full');
  assert.equal(policy.captureResults, 'full');
  assert.equal(policy.captureFullContent, false);
});

test('disables observability by default in production and captures summaries when explicitly enabled', () => {
  const disabledPolicy = getObservabilityPolicy({
    NODE_ENV: 'production',
  });
  const enabledPolicy = getObservabilityPolicy({
    NODE_ENV: 'production',
    OBSERVABILITY_ENABLED: 'true',
  });

  assert.equal(disabledPolicy.enabled, false);
  assert.equal(enabledPolicy.enabled, true);
  assert.equal(enabledPolicy.captureMessages, 'summary');
  assert.equal(enabledPolicy.captureResults, 'summary');
});

test('normalizes client identifiers and rejects malformed values', () => {
  assert.equal(normalizeClientId('abc-123_DEF'), 'abc-123_DEF');
  assert.equal(normalizeClientId('  abc-123  '), 'abc-123');
  assert.equal(normalizeClientId('bad value'), null);
  assert.equal(normalizeClientId(''), null);
  assert.equal(normalizeClientId(undefined), null);
});

test('summarizes long text without leaking full content', () => {
  const text = 'a'.repeat(250);
  const summary = summarizeText(text, 32);

  assert.ok(summary);
  assert.equal(summary.length, 35);
  assert.equal(summary.endsWith('...'), true);
});
