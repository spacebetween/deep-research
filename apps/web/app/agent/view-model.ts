import { type ClarificationField, type RecruiterAgentResult, type RecruiterCandidate } from './types';

export const splitSkillsSummary = (skillsSummary: string) => {
  const normalized = skillsSummary.trim();
  if (!normalized) return [];

  const hasStructuredDelimiters = /[\n\u2022;|]/.test(normalized);
  const segments = hasStructuredDelimiters
    ? normalized.split(/\r?\n|\u2022|;|\|/)
    : normalized.split(/,\s+/);

  return segments.map(segment => segment.trim()).filter(Boolean);
};

export const splitExperienceSummary = (experienceSummary: string) => {
  const normalized = experienceSummary.trim();
  if (!normalized) return [];

  const hasStructuredDelimiters = /[\n\u2022;|]/.test(normalized);
  if (hasStructuredDelimiters) {
    return normalized
      .split(/\r?\n|\u2022|;|\|/)
      .map(segment => segment.trim())
      .filter(Boolean);
  }

  const sentenceSegments = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(segment => segment.trim())
    .filter(Boolean);

  if (sentenceSegments.length > 1) return sentenceSegments;
  return [normalized];
};

export const buildAgentSummary = (result: RecruiterAgentResult) => {
  const queryCount = result.queries.length;
  const candidateCount = result.candidates.length;

  if (result.error) {
    return `Ran ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and returned ${candidateCount} candidates. Tool warning: ${result.error}`;
  }

  return `Ran ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and returned ${candidateCount} candidates.`;
};

export const formatMissingFields = (fields: ClarificationField[]) => {
  const uniqueFields = [...new Set(fields)];
  if (uniqueFields.length === 0) return 'details';
  if (uniqueFields.length === 2) return 'location and skills';
  return uniqueFields[0] === 'location' ? 'location' : 'skills';
};

export const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return initials || 'BU';
};

export const estimateFitScore = (candidate: RecruiterCandidate, index: number) => {
  const text = `${candidate.name} ${candidate.headline} ${candidate.skillsSummary} ${candidate.experienceSummary}`.toLowerCase();
  const signalBonus = ['lead', 'senior', 'head', 'principal', 'director', 'founder'].some(signal => text.includes(signal))
    ? 2
    : 0;
  const linkedinBonus = candidate.linkedinUrl.includes('linkedin.com') ? 1 : 0;
  const score = 94 - index * 4 + signalBonus + linkedinBonus;

  return Math.max(72, Math.min(98, score));
};

export const buildActiveSignals = (result: RecruiterAgentResult | null) => {
  if (!result) return ['Role brief', 'Candidate evidence', 'LinkedIn sourcing'];

  const criteria = result.criteria;
  const signals = [
    criteria.role ? `Role: ${criteria.role}` : null,
    criteria.seniority ? `Seniority: ${criteria.seniority}` : null,
    ...criteria.locations.map(location => `Location: ${location}`),
    ...criteria.companies.map(company => `Company: ${company}`),
    criteria.linkedinOnly ? 'LinkedIn only' : null,
    ...result.queries.slice(0, 2).map(query => `Query: ${query}`),
  ];

  return signals.filter((signal): signal is string => Boolean(signal)).slice(0, 8);
};

export const getResultStatusCopy = (result: RecruiterAgentResult | null, isLoading: boolean) => {
  if (isLoading) return 'Searching and ranking candidates from the agent workflow';
  if (!result) return 'No search run yet';
  if (result.error) return 'Results returned with a tool warning';
  return `${result.candidates.length} candidate${result.candidates.length === 1 ? '' : 's'} returned by the agent`;
};

export const getCandidateLocation = (result: RecruiterAgentResult | null) => {
  const locations = result?.criteria.locations ?? [];
  return locations.length > 0 ? locations[0] : 'Location inferred from brief';
};
