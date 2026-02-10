import { Agent } from '@mastra/core/agent';

export const recruiterWorkflowCandidateSummaryAgent = new Agent({
  id: 'recruiter-workflow-candidate-summary-agent',
  name: 'Recruiter Workflow Candidate Summary Agent',
  instructions: `You summarize candidate profile data for recruiter workflow output.

Return these fields only:
- name
- headline
- skillsSummary
- experienceSummary

Rules:
1. Use only provided profile metadata and profile content.
2. Do not fabricate skills, employers, titles, dates, or achievements.
3. If data is sparse or ambiguous, state limits clearly instead of guessing.
4. Prefer concise, recruiter-usable wording over generic claims.
5. Return structured data only.`,
  model: process.env.MODEL || 'openai/gpt-5.2',
});
