import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeSessions } from './sessions';

test('summarizes sessions by session and conversation identifiers', () => {
  const sessions = summarizeSessions([
    {
      session_id: 'session-a',
      conversation_id: 'conversation-a',
      request_id: 'request-1',
      completed_at: '2026-05-27T09:00:00.000Z',
      status_code: 200,
      response_type: 'results',
      user_query: 'Find data engineers',
      candidate_count: 4,
      duration_ms: 1200,
      user_id: 'user-1',
      user_email: 'recruiter@example.com',
      user_name: 'Recruiter One',
    },
    {
      session_id: 'session-a',
      conversation_id: 'conversation-a',
      request_id: 'request-2',
      completed_at: '2026-05-27T09:04:00.000Z',
      status_code: 400,
      response_type: null,
      user_query: 'Actually Manchester only',
      candidate_count: 0,
      duration_ms: 300,
      user_id: 'user-1',
      user_email: 'recruiter@example.com',
      user_name: 'Recruiter One',
    },
  ]);

  assert.deepEqual(sessions, [
    {
      sessionId: 'session-a',
      conversationId: 'conversation-a',
      startedAt: '2026-05-27T09:00:00.000Z',
      lastSeenAt: '2026-05-27T09:04:00.000Z',
      requestCount: 2,
      failureCount: 1,
      totalCandidates: 4,
      latestQuery: 'Actually Manchester only',
      latestResponseType: null,
      totalDurationMs: 1500,
      userId: 'user-1',
      userEmail: 'recruiter@example.com',
      userName: 'Recruiter One',
      requests: [
        {
          requestId: 'request-1',
          completedAt: '2026-05-27T09:00:00.000Z',
          statusCode: 200,
          responseType: 'results',
          userQuery: 'Find data engineers',
          candidateCount: 4,
          durationMs: 1200,
        },
        {
          requestId: 'request-2',
          completedAt: '2026-05-27T09:04:00.000Z',
          statusCode: 400,
          responseType: null,
          userQuery: 'Actually Manchester only',
          candidateCount: 0,
          durationMs: 300,
        },
      ],
    },
  ]);
});
