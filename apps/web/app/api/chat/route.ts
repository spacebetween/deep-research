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
  agentId: z.enum(['peopleResearchAgent', 'researchAgent']).default('peopleResearchAgent'),
  messages: z.array(messageSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const mastra = getMastra();
    const agent = mastra.getAgent(parsed.agentId);
    const conversation = parsed.messages
      .map(message => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');

    const response = await agent.generate(
      [
        `You are continuing a chat conversation.\n\nConversation so far:\n${conversation}\n\nRespond to the latest user request.`,
      ],
      { maxSteps: 12 },
    );

    return NextResponse.json({ text: response.text });
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
