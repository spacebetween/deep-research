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
    const conversation = (parsed.messages ?? [])
      .map(message => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');

    const prompt = [
      'You are continuing a recruiter sourcing conversation.',
      conversation ? `Conversation so far:\n${conversation}` : null,
      `Latest recruiter request:\n${parsed.query}`,
      // `If you need more information run a calibration pass and return up to ${maxCandidates} qualified candidates in structured output.`,
      'Ask only for missing fields between location and skills.',
      'If any of those fields are missing, ask explicit follow-up questions and still run a best-effort search this turn.',
      'Use responseType "results_with_clarification" when you have candidates plus follow-up questions.',
      'Use responseType "clarification" with result=null when no usable candidates are available yet.',
      'Use responseType "results" when no clarification is needed.',
      'Only include candidates sourced from real tool results with LinkedIn URLs.',
      'Do not fabricate names, employers, roles, or URLs.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await agent.generate(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        structuredOutput: {
          schema: agentApiResponseSchema,
        },
        maxSteps: 16,
      },
    );

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
