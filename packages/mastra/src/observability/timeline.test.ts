import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRequestTimeline } from './timeline';

test('groups request counts into hourly buckets by status family', () => {
  const points = buildRequestTimeline(
    [
      { completed_at: '2026-05-27T09:05:00.000Z', status_code: 200 },
      { completed_at: '2026-05-27T09:30:00.000Z', status_code: 201 },
      { completed_at: '2026-05-27T09:45:00.000Z', status_code: 404 },
      { completed_at: '2026-05-27T10:10:00.000Z', status_code: 500 },
    ],
    new Date('2026-05-27T10:59:00.000Z'),
    2,
  );

  assert.deepEqual(points, [
    {
      bucketStart: '2026-05-27T09:00:00.000Z',
      label: '09:00',
      total: 3,
      status2xx: 2,
      status3xx: 0,
      status4xx: 1,
      status5xx: 0,
    },
    {
      bucketStart: '2026-05-27T10:00:00.000Z',
      label: '10:00',
      total: 1,
      status2xx: 0,
      status3xx: 0,
      status4xx: 0,
      status5xx: 1,
    },
  ]);
});
