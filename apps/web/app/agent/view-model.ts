import {
  type AgentClarification,
  type CandidateDecision,
  type CandidateViewModel,
  type RecruiterAgentResult,
  type RecruiterCandidate,
} from './types';

export const progressSteps = ['Reading brief', 'Building criteria', 'Searching profiles', 'Ranking shortlist'];

const trimValue = (value: string) => value.trim();

export const splitSummary = (value: string) => {
  const normalized = trimValue(value);
  if (!normalized) return [];

  const hasStructuredDelimiters = /[\n\u2022;|]/.test(normalized);
  const segments = hasStructuredDelimiters
    ? normalized.split(/\r?\n|\u2022|;|\|/)
    : normalized.split(/,\s+|(?<=[.!?])\s+(?=[A-Z0-9])/);

  return segments.map(segment => segment.trim()).filter(Boolean);
};

export const candidateId = (candidate: RecruiterCandidate) => candidate.linkedinUrl.toLowerCase();

const uniqueFirst = (values: string[], maxCount: number) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= maxCount) break;
  }

  return result;
};

export const buildCandidateViewModels = (
  result: RecruiterAgentResult | null,
  decisions: Record<string, CandidateDecision>,
  comparisonIds: string[],
  selectedId: string | null,
): CandidateViewModel[] => {
  if (!result) return [];

  return result.candidates.map((candidate, index) => {
    const id = candidateId(candidate);
    const skillSignals = splitSummary(candidate.skillsSummary);
    const experienceSignals = splitSummary(candidate.experienceSummary);
    const linkedInSignal = /linkedin\.com/i.test(candidate.linkedinUrl) ? ['LinkedIn profile verified'] : [];
    const evidence = uniqueFirst([...linkedInSignal, ...skillSignals, ...experienceSignals], 5);
    const textDensity = `${candidate.headline} ${candidate.skillsSummary} ${candidate.experienceSummary}`.length;
    const fitScore = Math.min(97, 72 + evidence.length * 4 + Math.min(9, Math.floor(textDensity / 180)) - index * 2);
    const sourceConfidence = Math.min(98, 68 + linkedInSignal.length * 14 + Math.min(16, evidence.length * 3));

    const strengths = uniqueFirst(
      [
        ...skillSignals.slice(0, 2).map(signal => `Skill signal: ${signal}`),
        ...experienceSignals.slice(0, 2).map(signal => `Experience signal: ${signal}`),
        linkedInSignal[0],
      ].filter(Boolean),
      3,
    );

    const gaps = uniqueFirst(
      [
        sourceConfidence < 84 ? 'Needs stronger public-source confidence before outreach.' : '',
        result.criteria.locations.length === 0 ? 'Location is still not pinned down.' : '',
        !result.criteria.seniority ? 'Seniority is inferred, not explicit.' : '',
        evidence.length < 4 ? 'Profile has limited extractable evidence.' : '',
      ],
      3,
    );

    return {
      candidate,
      id,
      index,
      fitScore,
      sourceConfidence,
      strengths: strengths.length ? strengths : ['Enough profile signal to review manually.'],
      gaps: gaps.length ? gaps : ['No major display gaps from the returned profile data.'],
      evidence: evidence.length ? evidence : ['Limited public profile evidence returned.'],
      decision: decisions[id] ?? 'new',
      isCompared: comparisonIds.includes(id),
      isSelected: selectedId === id,
    };
  });
};

export const buildBriefScore = (result: RecruiterAgentResult | null, clarification: AgentClarification | null) => {
  if (!result) {
    return clarification?.missingFields.length ? 34 : 18;
  }

  const checks = [
    result.criteria.role.trim().length > 0,
    result.criteria.locations.length > 0,
    result.criteria.companies.length > 0,
    Boolean(result.criteria.seniority),
    result.queries.length > 0,
    result.candidates.length > 0,
    !result.error,
    !clarification?.missingFields.length,
  ];

  const passed = checks.filter(Boolean).length;
  return Math.max(24, Math.round((passed / checks.length) * 100));
};

export const buildChangedChips = (result: RecruiterAgentResult | null, clarification: AgentClarification | null) => {
  const chips: string[] = [];

  if (result?.criteria.role) chips.push(`Role: ${result.criteria.role}`);
  if (result?.criteria.seniority) chips.push(`Seniority: ${result.criteria.seniority}`);
  result?.criteria.locations.slice(0, 3).forEach(location => chips.push(`Location: ${location}`));
  result?.criteria.companies.slice(0, 3).forEach(company => chips.push(`Company: ${company}`));
  clarification?.missingFields.forEach(field => chips.push(`Missing: ${field}`));

  return chips.length ? chips : ['Brief is waiting for a first pass'];
};

export const buildActivity = (
  result: RecruiterAgentResult | null,
  clarification: AgentClarification | null,
  responseType?: string,
) => {
  const events = ['Initial brief captured'];

  if (responseType) {
    events.push(responseType === 'results' ? 'Agent returned shortlist' : 'Agent requested calibration');
  }

  if (clarification?.missingFields.length) {
    events.push(`Needs ${clarification.missingFields.join(' + ')}`);
  }

  if (result?.queries.length) {
    events.push(`${result.queries.length} search ${result.queries.length === 1 ? 'query' : 'queries'} generated`);
  }

  if (result?.candidates.length) {
    events.push(`${result.candidates.length} candidates ranked`);
  }

  return events;
};

export const buildAgentSummary = (result: RecruiterAgentResult) => {
  const queryCount = result.queries.length;
  const candidateCount = result.candidates.length;

  if (result.error) {
    return `Ran ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and returned ${candidateCount} candidates. Tool warning: ${result.error}`;
  }

  return `Ran ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and returned ${candidateCount} candidates.`;
};
