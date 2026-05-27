import { z } from 'zod';

export const recruiterCriteriaSchema = z.object({
  role: z.string(),
  companies: z.array(z.string()),
  locations: z.array(z.string()),
  seniority: z.string().nullable(),
  linkedinOnly: z.boolean(),
});

export const recruiterCandidateSchema = z.object({
  name: z.string(),
  headline: z.string(),
  skillsSummary: z.string(),
  experienceSummary: z.string(),
  linkedinUrl: z.string().min(1),
});

export const recruiterAgentResultSchema = z.object({
  criteria: recruiterCriteriaSchema,
  queries: z.array(z.string()),
  error: z.string().nullable(),
  candidates: z.array(recruiterCandidateSchema),
});

export const clarificationFieldSchema = z.enum(['location', 'skills']);

export const agentClarificationSchema = z.object({
  missingFields: z.array(clarificationFieldSchema),
  questions: z.array(z.string()),
});

export const agentApiResponseSchema = z.object({
  responseType: z.enum(['clarification', 'results', 'results_with_clarification']),
  assistantMessage: z.string().min(1),
  clarification: agentClarificationSchema.nullable(),
  result: recruiterAgentResultSchema.nullable(),
});

export const legacyRecruiterApiResponseSchema = z.object({
  result: recruiterAgentResultSchema,
});

export type ClarificationField = z.infer<typeof clarificationFieldSchema>;
export type RecruiterCandidate = z.infer<typeof recruiterCandidateSchema>;
export type RecruiterAgentResult = z.infer<typeof recruiterAgentResultSchema>;
export type AgentClarification = z.infer<typeof agentClarificationSchema>;
export type AgentApiResponse = z.infer<typeof agentApiResponseSchema>;

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  requestId?: string;
  result?: RecruiterAgentResult;
  clarification?: AgentClarification;
  responseType?: AgentApiResponse['responseType'];
};
