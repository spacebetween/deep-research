export type RecruiterCriteria = {
  role: string;
  companies: string[];
  locations: string[];
  seniority: string | null;
  linkedinOnly: boolean;
};

export type RecruiterCandidate = {
  name: string;
  headline: string;
  skillsSummary: string;
  experienceSummary: string;
  linkedinUrl: string;
};

export type RecruiterAgentResult = {
  criteria: RecruiterCriteria;
  queries: string[];
  error: string | null;
  candidates: RecruiterCandidate[];
};

export type ClarificationField = 'location' | 'skills';

export type AgentClarification = {
  missingFields: ClarificationField[];
  questions: string[];
};

export type AgentApiResponse = {
  responseType: 'clarification' | 'results' | 'results_with_clarification';
  assistantMessage: string;
  clarification: AgentClarification | null;
  result: RecruiterAgentResult | null;
};

export type CandidateDecision = 'new' | 'saved' | 'rejected';

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  result?: RecruiterAgentResult;
  clarification?: AgentClarification;
  responseType?: AgentApiResponse['responseType'];
};

export type CandidateViewModel = {
  candidate: RecruiterCandidate;
  id: string;
  index: number;
  fitScore: number;
  sourceConfidence: number;
  strengths: string[];
  gaps: string[];
  evidence: string[];
  decision: CandidateDecision;
  isCompared: boolean;
  isSelected: boolean;
};
