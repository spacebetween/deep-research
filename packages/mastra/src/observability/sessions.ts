export type SessionRequestRow = {
  session_id: string | null;
  conversation_id: string | null;
  request_id: string;
  completed_at: string;
  status_code: number;
  response_type: string | null;
  user_query: string | null;
  candidate_count: number;
  duration_ms: number;
};

export type SessionSummary = {
  sessionId: string;
  conversationId: string;
  startedAt: string;
  lastSeenAt: string;
  requestCount: number;
  failureCount: number;
  totalCandidates: number;
  latestQuery: string | null;
  latestResponseType: string | null;
  totalDurationMs: number;
  requests: Array<{
    requestId: string;
    completedAt: string;
    statusCode: number;
    responseType: string | null;
    userQuery: string | null;
    candidateCount: number;
    durationMs: number;
  }>;
};

const fallbackId = 'unknown';

export const summarizeSessions = (rows: SessionRequestRow[]): SessionSummary[] => {
  const sortedRows = [...rows].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  const sessions = new Map<string, SessionSummary>();

  for (const row of sortedRows) {
    const sessionId = row.session_id ?? fallbackId;
    const conversationId = row.conversation_id ?? fallbackId;
    const key = `${sessionId}:${conversationId}`;
    const existing = sessions.get(key);
    const request = {
      requestId: row.request_id,
      completedAt: row.completed_at,
      statusCode: row.status_code,
      responseType: row.response_type,
      userQuery: row.user_query,
      candidateCount: row.candidate_count,
      durationMs: row.duration_ms,
    };

    if (!existing) {
      sessions.set(key, {
        sessionId,
        conversationId,
        startedAt: row.completed_at,
        lastSeenAt: row.completed_at,
        requestCount: 1,
        failureCount: row.status_code >= 400 ? 1 : 0,
        totalCandidates: row.candidate_count,
        latestQuery: row.user_query,
        latestResponseType: row.response_type,
        totalDurationMs: row.duration_ms,
        requests: [request],
      });
      continue;
    }

    existing.lastSeenAt = row.completed_at;
    existing.requestCount += 1;
    existing.failureCount += row.status_code >= 400 ? 1 : 0;
    existing.totalCandidates += row.candidate_count;
    existing.latestQuery = row.user_query;
    existing.latestResponseType = row.response_type;
    existing.totalDurationMs += row.duration_ms;
    existing.requests.push(request);
  }

  return [...sessions.values()].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
};
