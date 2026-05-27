import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMastra,
  normalizeClientId,
  recordObservabilityRequest,
  runWithObservabilityContext,
} from '@deep-research/mastra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const requestSchema = z.object({
  query: z.string().min(1),
  maxCandidates: z.number().int().min(1).max(20).optional(),
  messages: z.array(messageSchema).optional(),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
});

const recruiterCriteriaSchema = z.object({
  role: z.string(),
  companies: z.array(z.string()),
  locations: z.array(z.string()),
  seniority: z.string().nullable(),
  linkedinOnly: z.boolean(),
});

const recruiterCandidateSchema = z.object({
  name: z.string(),
  headline: z.string(),
  skillsSummary: z.string(),
  experienceSummary: z.string(),
  linkedinUrl: z.string().min(1),
});

const recruiterAgentResultSchema = z.object({
  criteria: recruiterCriteriaSchema,
  queries: z.array(z.string()),
  error: z.string().nullable(),
  candidates: z.array(recruiterCandidateSchema),
});

const clarificationFieldSchema = z.enum(['location', 'skills']);

const agentClarificationSchema = z.object({
  missingFields: z.array(clarificationFieldSchema),
  questions: z.array(z.string()),
});

const agentApiResponseSchema = z.object({
  responseType: z.enum(['clarification', 'results', 'results_with_clarification']),
  assistantMessage: z.string().min(1),
  clarification: agentClarificationSchema.nullable(),
  result: recruiterAgentResultSchema.nullable(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = new Date();
  const startedMs = Date.now();
  let sessionId: string | null = null;
  let conversationId: string | null = null;
  let normalizedQuery: string | null = null;
  let messagesForTelemetry: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    const maxCandidates = parsed.maxCandidates ?? 5;
    sessionId = normalizeClientId(parsed.sessionId);
    conversationId = normalizeClientId(parsed.conversationId);

    const mastra = getMastra();
    const agent = mastra.getAgent('linkedinCandidateSourcingAgent');
    const incomingMessages = (parsed.messages ?? []).map(message => ({
      role: message.role,
      content: message.content,
    }));
    normalizedQuery = parsed.query.trim();
    const latestUserMessage = [...incomingMessages].reverse().find(message => message.role === 'user');
    const latestMatchesQuery = latestUserMessage?.content.trim() === normalizedQuery;

    const messages =
      incomingMessages.length === 0
        ? [{ role: 'user' as const, content: normalizedQuery }]
        : latestMatchesQuery
          ? incomingMessages
          : [...incomingMessages, { role: 'user' as const, content: normalizedQuery }];

    const generationMessages = messages as Parameters<typeof agent.generate>[0];
    messagesForTelemetry = messages;

    const response = await runWithObservabilityContext(
      { requestId, sessionId, conversationId, route: '/api/agent' },
      () =>
        agent.generate(generationMessages, {
          system: ``,
          structuredOutput: {
            schema: agentApiResponseSchema,
          },
          maxSteps: 16,
        }),
    );

    const statusCode = 200;
    await recordObservabilityRequest({
      requestId,
      route: '/api/agent',
      method: 'POST',
      sessionId,
      conversationId,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMs,
      statusCode,
      responseType: response.object.responseType,
      errorMessage: null,
      errorType: null,
      userQuery: normalizedQuery,
      latestUserMessage: [...messagesForTelemetry].reverse().find(message => message.role === 'user')?.content ?? null,
      messageCount: messagesForTelemetry.length,
      assistantMessage: response.object.assistantMessage,
      criteria: response.object.result?.criteria ?? null,
      clarification: response.object.clarification,
      queries: response.object.result?.queries ?? [],
      candidateCount: response.object.result?.candidates.length ?? 0,
      messages: messagesForTelemetry,
      candidates: response.object.result?.candidates ?? [],
    });

    return NextResponse.json(response.object, {
      status: statusCode,
      headers: { 'x-request-id': requestId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = error instanceof z.ZodError || /required|invalid|parse/i.test(message) ? 400 : 500;

    await recordObservabilityRequest({
      requestId,
      route: '/api/agent',
      method: 'POST',
      sessionId,
      conversationId,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMs,
      statusCode: status,
      responseType: null,
      errorMessage: message,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      userQuery: normalizedQuery,
      latestUserMessage: [...messagesForTelemetry].reverse().find(msg => msg.role === 'user')?.content ?? null,
      messageCount: messagesForTelemetry.length,
      assistantMessage: null,
      criteria: null,
      clarification: null,
      queries: [],
      candidateCount: 0,
      messages: messagesForTelemetry,
      candidates: [],
    });

    return NextResponse.json(
      {
        error: message,
      },
      { status, headers: { 'x-request-id': requestId } },
    );
  }
}
