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

const requestSchema = z.object({
  query: z.string().min(1),
  maxCandidates: z.number().int().min(1).max(20).optional(),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = new Date();
  const startedMs = Date.now();
  let sessionId: string | null = null;
  let conversationId: string | null = null;
  let userQuery: string | null = null;

  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    sessionId = normalizeClientId(parsed.sessionId);
    conversationId = normalizeClientId(parsed.conversationId);
    userQuery = parsed.query.trim();

    const mastra = getMastra();
    const workflow = mastra.getWorkflow('recruiterCandidateWorkflow');
    const run = await workflow.createRun();
    const result = await runWithObservabilityContext(
      { requestId, sessionId, conversationId, route: '/api/recruiters' },
      () =>
        run.start({
          inputData: {
            request: parsed.query,
            maxCandidates: parsed.maxCandidates ?? 5,
          },
        }),
    );

    if (result.status !== 'success') {
      if (result.status === 'failed') {
        throw result.error;
      }
      throw new Error(`Workflow did not complete successfully (status: ${result.status})`);
    }

    await recordObservabilityRequest({
      requestId,
      route: '/api/recruiters',
      method: 'POST',
      sessionId,
      conversationId,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMs,
      statusCode: 200,
      responseType: 'results',
      errorMessage: null,
      errorType: null,
      userQuery,
      latestUserMessage: userQuery,
      messageCount: 1,
      assistantMessage: null,
      criteria: result.result.criteria,
      clarification: null,
      queries: result.result.queries,
      candidateCount: result.result.candidates.length,
      messages: [{ role: 'user', content: userQuery }],
      candidates: result.result.candidates,
    });

    return NextResponse.json(
      {
        result: result.result,
      },
      { headers: { 'x-request-id': requestId } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = error instanceof z.ZodError || /required|invalid|parse/i.test(message) ? 400 : 500;

    await recordObservabilityRequest({
      requestId,
      route: '/api/recruiters',
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
      userQuery,
      latestUserMessage: userQuery,
      messageCount: userQuery ? 1 : 0,
      assistantMessage: null,
      criteria: null,
      clarification: null,
      queries: [],
      candidateCount: 0,
      messages: userQuery ? [{ role: 'user', content: userQuery }] : [],
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
