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
  agentId: z.enum(['peopleResearchAgent', 'researchAgent']).default('peopleResearchAgent'),
  messages: z.array(messageSchema).min(1),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = new Date();
  const startedMs = Date.now();
  let sessionId: string | null = null;
  let conversationId: string | null = null;
  let messagesForTelemetry: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    sessionId = normalizeClientId(parsed.sessionId);
    conversationId = normalizeClientId(parsed.conversationId);
    messagesForTelemetry = parsed.messages;

    const mastra = getMastra();
    const agent = mastra.getAgent(parsed.agentId);
    const conversation = parsed.messages
      .map(message => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');

    const response = await runWithObservabilityContext(
      { requestId, sessionId, conversationId, route: '/api/chat' },
      () =>
        agent.generate(
          [
            `You are continuing a chat conversation.\n\nConversation so far:\n${conversation}\n\nRespond to the latest user request.`,
          ],
          { maxSteps: 12 },
        ),
    );

    await recordObservabilityRequest({
      requestId,
      route: '/api/chat',
      method: 'POST',
      sessionId,
      conversationId,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMs,
      statusCode: 200,
      responseType: 'text',
      errorMessage: null,
      errorType: null,
      userQuery: [...messagesForTelemetry].reverse().find(message => message.role === 'user')?.content ?? null,
      latestUserMessage: [...messagesForTelemetry].reverse().find(message => message.role === 'user')?.content ?? null,
      messageCount: messagesForTelemetry.length,
      assistantMessage: response.text,
      criteria: null,
      clarification: null,
      queries: [],
      candidateCount: 0,
      messages: messagesForTelemetry,
      candidates: [],
    });

    return NextResponse.json({ text: response.text }, { headers: { 'x-request-id': requestId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = error instanceof z.ZodError || /required|invalid|parse/i.test(message) ? 400 : 500;

    await recordObservabilityRequest({
      requestId,
      route: '/api/chat',
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
      userQuery: [...messagesForTelemetry].reverse().find(msg => msg.role === 'user')?.content ?? null,
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
