import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMastra } from '@deep-research/mastra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  query: z.string().min(1),
  maxCandidates: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const mastra = getMastra();
    const workflow = mastra.getWorkflow('recruiterCandidateWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: {
        request: parsed.query,
        maxCandidates: parsed.maxCandidates ?? 8,
      },
    });

    if (result.status !== 'success') {
      if (result.status === 'failed') {
        throw result.error;
      }
      throw new Error(`Workflow did not complete successfully (status: ${result.status})`);
    }

    return NextResponse.json({
      result: result.result,
    });
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
