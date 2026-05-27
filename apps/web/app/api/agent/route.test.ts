import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

test('agent route returns request id for validation failures without telemetry side effects', async () => {
  const previousEnabled = process.env.OBSERVABILITY_ENABLED;
  process.env.OBSERVABILITY_ENABLED = 'false';

  try {
    const response = await POST(
      new Request('http://localhost/api/agent', {
        method: 'POST',
        body: JSON.stringify({ query: '' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.match(response.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/);
    assert.equal(typeof payload.error, 'string');
  } finally {
    if (previousEnabled === undefined) {
      delete process.env.OBSERVABILITY_ENABLED;
    } else {
      process.env.OBSERVABILITY_ENABLED = previousEnabled;
    }
  }
});
