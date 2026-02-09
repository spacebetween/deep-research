import { Agent } from '@mastra/core/agent';

export const recruiterCriteriaAgent = new Agent({
  id: 'recruiter-criteria-agent',
  name: 'Recruiter Criteria Agent',
  instructions: `You convert recruiter requests into concrete people-search criteria.

Required output fields:
- role: string
- companies: string[]
- locations: string[]
- seniority: string | null
- linkedinOnly: boolean
- queries: string[] (2-3 focused query strings)

Rules:
1. Follow the same intent as a recruiter people search flow: identify role, company, geography, and seniority.
2. Keep queries specific and practical, using forms like "<seniority> <role> at <company> in <location>".
3. If company or location is missing, produce focused alternatives using role + known constraints.
4. Set linkedinOnly=true unless the user explicitly requests non-LinkedIn sources.
5. Return only structured data and never include markdown or prose outside schema fields.`,
  model: process.env.MODEL || 'openai/gpt-5.2',
});
