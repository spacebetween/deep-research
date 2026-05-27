import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createClient, type Client } from '@libsql/client';
import { getObservabilityPolicy } from './policy';
import { summarizeSessions, type SessionRequestRow } from './sessions';
import { buildRequestTimeline } from './timeline';

type QueryExecutor = {
  execute(sql: string, args?: unknown[]): Promise<void>;
  select<T extends Record<string, unknown>>(sql: string, args?: unknown[]): Promise<T[]>;
};

type ToolResult = {
  title?: string;
  url?: string;
  summary?: string | null;
  content?: string | null;
};

export type ObservabilityRequestRecord = {
  requestId: string;
  route: string;
  method: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  sessionId: string | null;
  conversationId: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  statusCode: number;
  responseType: string | null;
  errorMessage: string | null;
  errorType: string | null;
  userQuery: string | null;
  latestUserMessage: string | null;
  messageCount: number;
  assistantMessage: string | null;
  criteria: unknown;
  clarification: unknown;
  queries: string[];
  candidateCount: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  candidates: Array<{
    name: string;
    headline: string;
    linkedinUrl: string;
    skillsSummary?: string;
    experienceSummary?: string;
  }>;
};

export type ObservabilityToolCallRecord = {
  requestId: string | null;
  sessionId: string | null;
  conversationId: string | null;
  toolName: string;
  query: string | null;
  requestedCount: number | null;
  linkedinOnly: boolean | null;
  returnedCount: number;
  durationMs: number;
  errorMessage: string | null;
  results: ToolResult[];
};

export type ObservabilityUserEventRecord = {
  requestId: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  sessionId: string | null;
  conversationId: string | null;
  eventType: 'linkedin_click' | 'result_feedback';
  candidateUrl: string | null;
  feedbackValue: string | null;
  metadata: unknown;
};

const require = createRequire(import.meta.url);

let executorPromise: Promise<QueryExecutor> | null = null;

const getDatabaseConnectionString = (): string | undefined => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const database = process.env.AZURE_POSTGRESQL_DATABASE;
  const host = process.env.AZURE_POSTGRESQL_HOST;
  const password = process.env.AZURE_POSTGRESQL_PASSWORD;
  const user = process.env.AZURE_POSTGRESQL_USER;
  const port = process.env.AZURE_POSTGRESQL_PORT || '5432';

  if (!database || !host || !password || !user) return undefined;

  const sslRaw = process.env.AZURE_POSTGRESQL_SSL ?? '';
  const sslEnabled = ['1', 'true', 'yes', 'require'].includes(sslRaw.toLowerCase());
  const sslQuery = sslEnabled ? '?sslmode=require' : '';

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}${sslQuery}`;
};

const createLibsqlExecutor = (): QueryExecutor => {
  const localDbPath = resolve(process.cwd(), '.mastra-dev', 'observability.db');
  mkdirSync(dirname(localDbPath), { recursive: true });
  const client = createClient({ url: `file:${localDbPath}` });

  return {
    execute: async (sql, args = []) => {
      await client.execute({ sql, args: args as never });
    },
    select: async <T extends Record<string, unknown>>(sql: string, args: unknown[] = []) => {
      const result = await client.execute({ sql, args: args as never });
      return result.rows as unknown as T[];
    },
  };
};

const createPostgresExecutor = (connectionString: string): QueryExecutor => {
  const { Pool } = require('pg') as { Pool: new (config: { connectionString: string }) => { query: (sql: string, args?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } };
  const pool = new Pool({ connectionString });
  const normalizeSql = (sql: string) => {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  };

  return {
    execute: async (sql, args = []) => {
      await pool.query(normalizeSql(sql), args);
    },
    select: async <T extends Record<string, unknown>>(sql: string, args: unknown[] = []) => {
      const result = await pool.query(normalizeSql(sql), args);
      return result.rows as T[];
    },
  };
};

const getExecutor = async () => {
  if (!executorPromise) {
    executorPromise = Promise.resolve(
      getDatabaseConnectionString()
        ? createPostgresExecutor(getDatabaseConnectionString() as string)
        : createLibsqlExecutor(),
    ).then(async executor => {
      await ensureSchema(executor);
      await pruneExpiredRecords(executor);
      return executor;
    });
  }

  return executorPromise;
};

const json = (value: unknown) => JSON.stringify(value ?? null);

const toSqlNow = () => new Date().toISOString();

const isPostgres = () => Boolean(getDatabaseConnectionString());

const ensureSchema = async (executor: QueryExecutor) => {
  if (isPostgres()) {
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS observability_requests (
        request_id TEXT PRIMARY KEY,
        route TEXT NOT NULL,
        method TEXT NOT NULL,
        user_id TEXT,
        user_email TEXT,
        user_name TEXT,
        session_id TEXT,
        conversation_id TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        response_type TEXT,
        error_message TEXT,
        error_type TEXT,
        user_query TEXT,
        latest_user_message TEXT,
        message_count INTEGER NOT NULL,
        assistant_message TEXT,
        criteria_json TEXT,
        clarification_json TEXT,
        queries_json TEXT,
        candidate_count INTEGER NOT NULL,
        capture_messages TEXT NOT NULL,
        capture_results TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS observability_messages (
        id BIGSERIAL PRIMARY KEY,
        request_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT,
        content_summary TEXT
      )
    `);
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS observability_candidate_snapshots (
        id BIGSERIAL PRIMARY KEY,
        request_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        name TEXT,
        headline TEXT,
        linkedin_url TEXT,
        skills_summary TEXT,
        experience_summary TEXT
      )
    `);
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS observability_tool_calls (
        id BIGSERIAL PRIMARY KEY,
        request_id TEXT,
        user_id TEXT,
        user_email TEXT,
        user_name TEXT,
        session_id TEXT,
        conversation_id TEXT,
        tool_name TEXT NOT NULL,
        query TEXT,
        requested_count INTEGER,
        linkedin_only BOOLEAN,
        returned_count INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        error_message TEXT,
        results_json TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS observability_user_events (
        id BIGSERIAL PRIMARY KEY,
        request_id TEXT,
        user_id TEXT,
        user_email TEXT,
        user_name TEXT,
        session_id TEXT,
        conversation_id TEXT,
        event_type TEXT NOT NULL,
        candidate_url TEXT,
        feedback_value TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await ensureOptionalColumns(executor);
    return;
  }

  await executor.execute(`
    CREATE TABLE IF NOT EXISTS observability_requests (
      request_id TEXT PRIMARY KEY,
      route TEXT NOT NULL,
      method TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      session_id TEXT,
      conversation_id TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      status_code INTEGER NOT NULL,
      response_type TEXT,
      error_message TEXT,
      error_type TEXT,
      user_query TEXT,
      latest_user_message TEXT,
      message_count INTEGER NOT NULL,
      assistant_message TEXT,
      criteria_json TEXT,
      clarification_json TEXT,
      queries_json TEXT,
      candidate_count INTEGER NOT NULL,
      capture_messages TEXT NOT NULL,
      capture_results TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS observability_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      content_summary TEXT
    )
  `);
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS observability_candidate_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      name TEXT,
      headline TEXT,
      linkedin_url TEXT,
      skills_summary TEXT,
      experience_summary TEXT
    )
  `);
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS observability_tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      session_id TEXT,
      conversation_id TEXT,
      tool_name TEXT NOT NULL,
      query TEXT,
      requested_count INTEGER,
      linkedin_only INTEGER,
      returned_count INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      error_message TEXT,
      results_json TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS observability_user_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      session_id TEXT,
      conversation_id TEXT,
      event_type TEXT NOT NULL,
      candidate_url TEXT,
      feedback_value TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await ensureOptionalColumns(executor);
};

const ensureOptionalColumns = async (executor: QueryExecutor) => {
  const requestsColumns = [
    ['observability_requests', 'user_id'],
    ['observability_requests', 'user_email'],
    ['observability_requests', 'user_name'],
    ['observability_user_events', 'user_id'],
    ['observability_user_events', 'user_email'],
    ['observability_user_events', 'user_name'],
  ];

  for (const [table, column] of requestsColumns) {
    try {
      await executor.execute(
        isPostgres()
          ? `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} TEXT`
          : `ALTER TABLE ${table} ADD COLUMN ${column} TEXT`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column|already exists/i.test(message)) {
        throw error;
      }
    }
  }
};

const pruneExpiredRecords = async (executor: QueryExecutor) => {
  const policy = getObservabilityPolicy();
  const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000).toISOString();

  await executor.execute(
    `DELETE FROM observability_messages WHERE request_id IN (
      SELECT request_id FROM observability_requests WHERE completed_at < ?
    )`,
    [cutoff],
  );
  await executor.execute(
    `DELETE FROM observability_candidate_snapshots WHERE request_id IN (
      SELECT request_id FROM observability_requests WHERE completed_at < ?
    )`,
    [cutoff],
  );
  await executor.execute(
    `DELETE FROM observability_requests WHERE completed_at < ?`,
    [cutoff],
  );
  await executor.execute(
    `DELETE FROM observability_tool_calls WHERE created_at < ?`,
    [cutoff],
  );
  await executor.execute(
    `DELETE FROM observability_user_events WHERE created_at < ?`,
    [cutoff],
  );
};

export const recordObservabilityRequest = async (record: ObservabilityRequestRecord) => {
  const policy = getObservabilityPolicy();
  if (!policy.enabled) return;

  try {
    const executor = await getExecutor();
    await executor.execute(
      `INSERT INTO observability_requests (
        request_id, route, method, user_id, user_email, user_name, session_id, conversation_id, started_at, completed_at, duration_ms,
        status_code, response_type, error_message, error_type, user_query, latest_user_message,
        message_count, assistant_message, criteria_json, clarification_json, queries_json, candidate_count,
        capture_messages, capture_results, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.requestId,
        record.route,
        record.method,
        record.userId,
        record.userEmail,
        record.userName,
        record.sessionId,
        record.conversationId,
        record.startedAt,
        record.completedAt,
        record.durationMs,
        record.statusCode,
        record.responseType,
        record.errorMessage,
        record.errorType,
        record.userQuery,
        record.latestUserMessage,
        record.messageCount,
        record.assistantMessage,
        json(record.criteria),
        json(record.clarification),
        json(record.queries),
        record.candidateCount,
        policy.captureMessages,
        policy.captureResults,
        toSqlNow(),
      ],
    );

    if (policy.captureMessages !== 'off') {
      for (const [index, message] of record.messages.entries()) {
        await executor.execute(
          `INSERT INTO observability_messages (request_id, position, role, content, content_summary) VALUES (?, ?, ?, ?, ?)`,
          [
            record.requestId,
            index,
            message.role,
            policy.captureMessages === 'full' ? message.content : null,
            message.content.length > 240 ? `${message.content.slice(0, 240)}...` : message.content,
          ],
        );
      }
    }

    if (policy.captureResults !== 'off') {
      for (const [index, candidate] of record.candidates.entries()) {
        await executor.execute(
          `INSERT INTO observability_candidate_snapshots (
            request_id, position, name, headline, linkedin_url, skills_summary, experience_summary
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            record.requestId,
            index,
            candidate.name,
            candidate.headline,
            candidate.linkedinUrl,
            policy.captureResults === 'full' ? candidate.skillsSummary ?? null : null,
            policy.captureResults === 'full' ? candidate.experienceSummary ?? null : null,
          ],
        );
      }
    }
  } catch (error) {
    console.warn('[observability] failed to record request', error);
  }
};

export const recordObservabilityToolCall = async (record: ObservabilityToolCallRecord) => {
  const policy = getObservabilityPolicy();
  if (!policy.enabled) return;

  try {
    const executor = await getExecutor();
    const results = record.results.map(result => ({
      title: result.title ?? '',
      url: result.url ?? '',
      summary: result.summary ?? null,
      content: policy.captureFullContent ? result.content ?? null : null,
    }));

    await executor.execute(
      `INSERT INTO observability_tool_calls (
        request_id, session_id, conversation_id, tool_name, query, requested_count, linkedin_only,
        returned_count, duration_ms, error_message, results_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.requestId,
        record.sessionId,
        record.conversationId,
        record.toolName,
        record.query,
        record.requestedCount,
        record.linkedinOnly,
        record.returnedCount,
        record.durationMs,
        record.errorMessage,
        json(results),
        toSqlNow(),
      ],
    );
  } catch (error) {
    console.warn('[observability] failed to record tool call', error);
  }
};

export const recordObservabilityUserEvent = async (record: ObservabilityUserEventRecord) => {
  const policy = getObservabilityPolicy();
  if (!policy.enabled) return;

  try {
    const executor = await getExecutor();
    await executor.execute(
      `INSERT INTO observability_user_events (
        request_id, user_id, user_email, user_name, session_id, conversation_id, event_type, candidate_url, feedback_value, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.requestId,
        record.userId,
        record.userEmail,
        record.userName,
        record.sessionId,
        record.conversationId,
        record.eventType,
        record.candidateUrl,
        record.feedbackValue,
        json(record.metadata),
        toSqlNow(),
      ],
    );
  } catch (error) {
    console.warn('[observability] failed to record user event', error);
  }
};

export const getObservabilitySessions = async () => {
  const policy = getObservabilityPolicy();
  if (!policy.enabled) return [];

  const executor = await getExecutor();
  const rows = await executor.select<SessionRequestRow>(`
    SELECT session_id, conversation_id, user_id, user_email, user_name, request_id, completed_at, status_code, response_type,
      user_query, candidate_count, duration_ms
    FROM observability_requests
    ORDER BY completed_at DESC
    LIMIT 500
  `);

  return summarizeSessions(rows);
};

export const getObservabilityRequestDetail = async (requestId: string) => {
  const policy = getObservabilityPolicy();
  if (!policy.enabled) return null;

  const executor = await getExecutor();
  const requests = await executor.select(`
    SELECT request_id, route, method, user_id, user_email, user_name, session_id, conversation_id, started_at, completed_at,
      duration_ms, status_code, response_type, error_message, error_type, user_query,
      latest_user_message, message_count, assistant_message, criteria_json, clarification_json,
      queries_json, candidate_count, capture_messages, capture_results
    FROM observability_requests
    WHERE request_id = ?
    LIMIT 1
  `, [requestId]);
  const request = requests[0];
  if (!request) return null;

  const messages = await executor.select(`
    SELECT position, role, content, content_summary
    FROM observability_messages
    WHERE request_id = ?
    ORDER BY position ASC
  `, [requestId]);
  const candidates = await executor.select(`
    SELECT position, name, headline, linkedin_url, skills_summary, experience_summary
    FROM observability_candidate_snapshots
    WHERE request_id = ?
    ORDER BY position ASC
  `, [requestId]);
  const toolCalls = await executor.select(`
    SELECT tool_name, query, requested_count, linkedin_only, returned_count, duration_ms,
      error_message, results_json, created_at
    FROM observability_tool_calls
    WHERE request_id = ?
    ORDER BY created_at ASC
  `, [requestId]);
  const events = await executor.select(`
    SELECT event_type, user_id, user_email, user_name, candidate_url, feedback_value, metadata_json, created_at
    FROM observability_user_events
    WHERE request_id = ?
    ORDER BY created_at ASC
  `, [requestId]);

  return {
    request,
    messages,
    candidates,
    toolCalls,
    events,
  };
};

export const getObservabilitySummary = async () => {
  const policy = getObservabilityPolicy();
  if (!policy.enabled) {
    return {
      enabled: false,
      totals: { requestCount: 0, failedCount: 0, clarificationCount: 0, emptyResultCount: 0 },
      recentRequests: [],
      requestTimeline: [],
      slowRequests: [],
      toolCalls: [],
      recentEvents: [],
    };
  }

  const executor = await getExecutor();
  const totals = await executor.select<{
    request_count: number;
    failed_count: number;
    clarification_count: number;
    empty_result_count: number;
  }>(`
    SELECT
      COUNT(*) AS request_count,
      SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS failed_count,
      SUM(CASE WHEN response_type LIKE '%clarification%' THEN 1 ELSE 0 END) AS clarification_count,
      SUM(CASE WHEN candidate_count = 0 THEN 1 ELSE 0 END) AS empty_result_count
    FROM observability_requests
  `);
  const recentRequests = await executor.select(`
    SELECT request_id, route, user_id, user_email, user_name, session_id, conversation_id, completed_at, duration_ms, status_code,
      response_type, user_query, latest_user_message, assistant_message, candidate_count, error_message
    FROM observability_requests
    ORDER BY completed_at DESC
    LIMIT 25
  `);
  const slowRequests = await executor.select(`
    SELECT request_id, route, duration_ms, status_code, response_type, user_query, candidate_count
    FROM observability_requests
    ORDER BY duration_ms DESC
    LIMIT 10
  `);
  const timelineRows = await executor.select<{
    completed_at: string;
    status_code: number;
  }>(`
    SELECT completed_at, status_code
    FROM observability_requests
    WHERE completed_at >= ?
    ORDER BY completed_at ASC
  `, [new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()]);
  const toolCalls = await executor.select(`
    SELECT tool_name, query, requested_count, returned_count, duration_ms, error_message, created_at
    FROM observability_tool_calls
    ORDER BY created_at DESC
    LIMIT 25
  `);
  const recentEvents = await executor.select(`
    SELECT event_type, request_id, user_id, user_email, user_name, session_id, conversation_id, candidate_url, feedback_value, created_at
    FROM observability_user_events
    ORDER BY created_at DESC
    LIMIT 25
  `);

  return {
    enabled: true,
    totals: totals[0] ?? { request_count: 0, failed_count: 0, clarification_count: 0, empty_result_count: 0 },
    recentRequests,
    requestTimeline: buildRequestTimeline(timelineRows),
    slowRequests,
    toolCalls,
    recentEvents,
  };
};
