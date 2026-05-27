import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import 'dotenv/config';
import { getObservabilityContext, recordObservabilityToolCall } from '../observability';

const getExaClient = () => {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXA_API_KEY');
  }

  return new Exa(apiKey);
};

export const scrapePageTool = createTool({
  id: 'scrape-page',
  description:
    'Extract clean content from known webpage URLs, including user-provided candidate, company, article, and documentation pages',
  inputSchema: z.object({
    urls: z
      .array(z.string().url())
      .min(1)
      .max(5)
      .describe('Known webpage URLs to extract content from'),
    query: z
      .string()
      .optional()
      .describe('Optional focus question or research intent used to guide summaries and highlights'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        publishedDate: z.string().nullable(),
        author: z.string().nullable(),
        summary: z.string().nullable(),
        highlights: z.array(z.string()),
        content: z.string(),
      }),
    ),
    error: z.string().optional(),
  }),
  execute: async inputData => {
    const { urls, query } = inputData;
    const startedMs = Date.now();
    const context = getObservabilityContext();
    const toolName = 'scrape-page';
    const queryLabel = query ? `${query} ${urls.join(' ')}` : urls.join(' ');

    try {
      if (!process.env.EXA_API_KEY) {
        await recordObservabilityToolCall({
          requestId: context?.requestId ?? null,
          sessionId: context?.sessionId ?? null,
          conversationId: context?.conversationId ?? null,
          toolName,
          query: queryLabel,
          requestedCount: urls.length,
          linkedinOnly: null,
          returnedCount: 0,
          durationMs: Date.now() - startedMs,
          errorMessage: 'Missing API key',
          results: [],
        });
        return { results: [], error: 'Missing API key' };
      }

      const exa = getExaClient();
      const { results } = await exa.getContents(urls, {
        text: { maxCharacters: 12000 },
        summary: query ? { query } : true,
        highlights: query ? { query, maxCharacters: 2000 } : true,
        livecrawl: 'fallback',
      });

      const mappedResults = (results ?? []).map(result => ({
        title: result.title || '',
        url: result.url,
        publishedDate: result.publishedDate || null,
        author: result.author || null,
        summary: result.summary || null,
        highlights: result.highlights || [],
        content: result.text || '',
      }));

      await recordObservabilityToolCall({
        requestId: context?.requestId ?? null,
        sessionId: context?.sessionId ?? null,
        conversationId: context?.conversationId ?? null,
        toolName,
        query: queryLabel,
        requestedCount: urls.length,
        linkedinOnly: null,
        returnedCount: mappedResults.length,
        durationMs: Date.now() - startedMs,
        errorMessage: null,
        results: mappedResults,
      });

      return { results: mappedResults };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await recordObservabilityToolCall({
        requestId: context?.requestId ?? null,
        sessionId: context?.sessionId ?? null,
        conversationId: context?.conversationId ?? null,
        toolName,
        query: queryLabel,
        requestedCount: urls.length,
        linkedinOnly: null,
        returnedCount: 0,
        durationMs: Date.now() - startedMs,
        errorMessage,
        results: [],
      });

      return {
        results: [],
        error: errorMessage,
      };
    }
  },
});
