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

export const peopleSearchTool = createTool({
  id: 'people-search',
  description:
    'Search for people profiles with Exa using the people category, optionally constrained to LinkedIn profile URLs',
  inputSchema: z.object({
    query: z.string().describe('People search query, e.g. "VP Product at Microsoft in Seattle"'),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(25)
      .describe('Number of profiles to return, typically 5-8'),
    linkedinOnly: z.boolean().describe('If true, restrict results to LinkedIn domains'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        publishedDate: z.string().nullable(),
        author: z.string().nullable(),
        summary: z.string().nullable(),
        content: z.string(),
      }),
    ),
    error: z.string().optional(),
  }),
  execute: async inputData => {
    const { query, numResults, linkedinOnly } = inputData;
    const startedMs = Date.now();
    const context = getObservabilityContext();

    try {
      if (!process.env.EXA_API_KEY) {
        console.error('Error: EXA_API_KEY not found in environment variables');
        await recordObservabilityToolCall({
          requestId: context?.requestId ?? null,
          sessionId: context?.sessionId ?? null,
          conversationId: context?.conversationId ?? null,
          toolName: 'people-search',
          query,
          requestedCount: numResults,
          linkedinOnly,
          returnedCount: 0,
          durationMs: Date.now() - startedMs,
          errorMessage: 'Missing API key',
          results: [],
        });
        return { results: [], error: 'Missing API key' };
      }
      const exa = getExaClient();

      const searchOptions = {
        category: 'people' as const,
        numResults,
        includeDomains: linkedinOnly ? ['linkedin.com', 'www.linkedin.com'] : undefined,
      };

      const { results } = await exa.search(query, searchOptions);

      if (!results || results.length === 0) {
        await recordObservabilityToolCall({
          requestId: context?.requestId ?? null,
          sessionId: context?.sessionId ?? null,
          conversationId: context?.conversationId ?? null,
          toolName: 'people-search',
          query,
          requestedCount: numResults,
          linkedinOnly,
          returnedCount: 0,
          durationMs: Date.now() - startedMs,
          errorMessage: 'No results found',
          results: [],
        });
        return { results: [], error: 'No results found' };
      }

      const mappedResults = results.map(result => ({
          title: result.title || '',
          url: result.url,
          publishedDate: result.publishedDate || null,
          author: result.author || null,
          summary: result.text ? result.text.substring(0, 240) : null,
          content: result.text || '',
        }));

      await recordObservabilityToolCall({
        requestId: context?.requestId ?? null,
        sessionId: context?.sessionId ?? null,
        conversationId: context?.conversationId ?? null,
        toolName: 'people-search',
        query,
        requestedCount: numResults,
        linkedinOnly,
        returnedCount: mappedResults.length,
        durationMs: Date.now() - startedMs,
        errorMessage: null,
        results: mappedResults,
      });

      return {
        results: mappedResults,
      };
    } catch (error) {
      console.error('Error searching for people:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await recordObservabilityToolCall({
        requestId: context?.requestId ?? null,
        sessionId: context?.sessionId ?? null,
        conversationId: context?.conversationId ?? null,
        toolName: 'people-search',
        query,
        requestedCount: numResults,
        linkedinOnly,
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
