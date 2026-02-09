import { Agent } from '@mastra/core/agent';

export const candidateSummaryAgent = new Agent({
  id: 'candidate-summary-agent',
  name: 'Candidate Summary Agent',
  instructions: `You summarize candidate profile data for recruiters.

You are given raw candidate metadata and profile text. Produce concise recruiter-facing output:
- name
- headline
- skillsSummary
- experienceSummary

Rules:
1. Use only provided data and do not fabricate specifics.
2. Prefer concrete capabilities and role scope over generic wording.
3. Keep each summary concise and readable.
4. If details are missing, say so clearly instead of inventing content.
5. Return only structured data.`,
  model: process.env.MODEL || 'openai/gpt-5.2',
});
