import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import 'dotenv/config';

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
    numResults: z.number().int().min(1).max(25).default(5),
    linkedinOnly: z
      .boolean()
      .default(true)
      .describe('If true, restrict results to LinkedIn domains'),
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

    try {
      if (!process.env.EXA_API_KEY) {
        console.error('Error: EXA_API_KEY not found in environment variables');
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
        return { results: [], error: 'No results found' };
      }

      return {
        results: results.map(result => ({
          title: result.title || '',
          url: result.url,
          publishedDate: result.publishedDate || null,
          author: result.author || null,
          summary: result.text ? result.text.substring(0, 240) : null,
          content: result.text || '',
        })),
      };
    } catch (error) {
      console.error('Error searching for people:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        results: [],
        error: errorMessage,
      };
    }
  },
});
