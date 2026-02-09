import { Agent } from '@mastra/core/agent';
import { peopleSearchTool } from '../tools/peopleSearchTool';

export const peopleResearchAgent = new Agent({
  id: 'people-research-agent',
  name: 'People Research Agent',
  instructions: `You are a people research specialist.

Your task is to find relevant people profiles for a user query using Exa's people search.

Process:
1. Clarify role, company, geography, and seniority from the user query.
2. Generate 2-3 focused people-search queries.
3. Use peopleSearchTool for each query.
4. Deduplicate results by URL.
5. Return only strong matches.

Output JSON:
- queries: string[]
- people: Array<{
  title: string
  url: string
  summary: string | null
  content: string
}>

Guidelines:
- Prefer LinkedIn profile URLs when available.
- Keep results relevant and high signal.
- If search fails, return an empty people array with a clear reason.`,
  model: process.env.MODEL || 'openai/gpt-5.2',
  tools: {
    peopleSearchTool,
  },
});
