import { NextResponse } from 'next/server';
import { normalizeClientId, recordObservabilityUserEvent } from '@deep-research/mastra';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const eventSchema = z.object({
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  eventType: z.enum(['linkedin_click', 'result_feedback']),
  candidateUrl: z.string().url().optional(),
  feedbackValue: z
    .enum(['useful_shortlist', 'wrong_profile_type', 'too_broad', 'too_few_candidates', 'bad_location', 'missing_required_skills'])
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = eventSchema.parse(await request.json());
    const requestId = normalizeClientId(parsed.requestId);

    await recordObservabilityUserEvent({
      requestId,
      sessionId: normalizeClientId(parsed.sessionId),
      conversationId: normalizeClientId(parsed.conversationId),
      eventType: parsed.eventType,
      candidateUrl: parsed.candidateUrl ?? null,
      feedbackValue: parsed.feedbackValue ?? null,
      metadata: parsed.metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = error instanceof z.ZodError || /required|invalid|parse/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
