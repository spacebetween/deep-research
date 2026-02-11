import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMastra } from '@deep-research/mastra';

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
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    const maxCandidates = parsed.maxCandidates ?? 5;

    const mastra = getMastra();
    const agent = mastra.getAgent('linkedinCandidateSourcingAgent');
    const incomingMessages = (parsed.messages ?? []).map(message => ({
      role: message.role,
      content: message.content,
    }));
    const normalizedQuery = parsed.query.trim();
    const latestUserMessage = [...incomingMessages].reverse().find(message => message.role === 'user');
    const latestMatchesQuery = latestUserMessage?.content.trim() === normalizedQuery;

    const messages =
      incomingMessages.length === 0
        ? [{ role: 'user' as const, content: normalizedQuery }]
        : latestMatchesQuery
          ? incomingMessages
          : [...incomingMessages, { role: 'user' as const, content: normalizedQuery }];

    const generationMessages = messages as Parameters<typeof agent.generate>[0];

    const response = await agent.generate(generationMessages, {
      system: ``,
      structuredOutput: {
        schema: agentApiResponseSchema,
      },
      maxSteps: 16,
    });

    return NextResponse.json(response.object);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = /required|invalid|parse/i.test(message) ? 400 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
