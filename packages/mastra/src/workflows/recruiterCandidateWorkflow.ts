import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const searchCriteriaSchema = z.object({
  role: z.string().min(1),
  companies: z.array(z.string().min(1)),
  locations: z.array(z.string().min(1)),
  seniority: z.string().nullable(),
  linkedinOnly: z.boolean(),
  queries: z.array(z.string().min(1)).min(1),
});

const personSchema = z.object({
  title: z.string(),
  url: z.string().min(1),
  author: z.string().nullable(),
  publishedDate: z.string().nullable(),
  summary: z.string().nullable(),
  content: z.string(),
});

const candidateSummarySchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  skillsSummary: z.string().min(1),
  experienceSummary: z.string().min(1),
});

const recruiterCandidateSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  skillsSummary: z.string().min(1),
  experienceSummary: z.string().min(1),
  linkedinUrl: z.string().min(1),
});

const recruiterWorkflowInputSchema = z.object({
  request: z.string().min(1),
  maxCandidates: z.number().int().min(1).max(20).optional(),
});

const recruiterWorkflowOutputSchema = z.object({
  criteria: z.object({
    role: z.string(),
    companies: z.array(z.string()),
    locations: z.array(z.string()),
    seniority: z.string().nullable(),
    linkedinOnly: z.boolean(),
  }),
  queries: z.array(z.string()),
  error: z.string().nullable(),
  candidates: z.array(recruiterCandidateSchema),
});

const normalizeQueries = (queries: string[]): string[] => {
  const cleaned = queries.map(query => query.trim()).filter(Boolean);
  const deduped = [...new Set(cleaned)];
  return deduped.slice(0, 3);
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9+.#-]+/g)
    .map(token => token.trim())
    .filter(token => token.length > 2);

const countMatches = (text: string, targets: string[]) => {
  const haystack = text.toLowerCase();
  return targets.reduce((count, target) => (target && haystack.includes(target.toLowerCase()) ? count + 1 : count), 0);
};

const scoreCandidate = (
  person: z.infer<typeof personSchema>,
  criteria: Pick<z.infer<typeof searchCriteriaSchema>, 'role' | 'companies' | 'locations'>,
) => {
  const text = [person.title, person.author, person.summary, person.content].filter(Boolean).join(' ');

  const roleTokens = tokenize(criteria.role);
  const roleScore = countMatches(text, roleTokens);
  const companyScore = countMatches(text, criteria.companies);
  const locationScore = countMatches(text, criteria.locations);

  return roleScore * 2 + companyScore * 2 + locationScore;
};

const defineSearchCriteriaStep = createStep({
  id: 'define-search-criteria',
  inputSchema: recruiterWorkflowInputSchema,
  outputSchema: z.object({
    criteria: searchCriteriaSchema,
    maxCandidates: z.number().int().min(1).max(20),
  }),
  execute: async ({ inputData, mastra }) => {
    const maxCandidates = inputData.maxCandidates ?? 5;
    const agent = mastra.getAgent('recruiterWorkflowCriteriaAgent');
    const response = await agent.generate(
      [
        {
          role: 'user',
          content: `Recruiter request:
${inputData.request}

Calibration-first context:
- This run is for an initial calibration shortlist of up to ${maxCandidates} candidates.
- Build precise LinkedIn-oriented criteria for this initial pass.

Critical requirement:
- If the request references equipment or machinery, do not over-assume the role family.
- Keep role inference conservative and grounded in explicit request details.

Return structured criteria only.`,
        },
      ],
      {
        structuredOutput: {
          schema: searchCriteriaSchema,
        },
        maxSteps: 3,
      },
    );

    const normalizedQueries = normalizeQueries(response.object.queries);
    const fallbackQuery = inputData.request.trim();

    return {
      criteria: {
        ...response.object,
        queries: normalizedQueries.length > 0 ? normalizedQueries : [fallbackQuery],
      },
      maxCandidates,
    };
  },
});

const runCandidateSearchStep = createStep({
  id: 'run-candidate-search',
  inputSchema: z.object({
    criteria: searchCriteriaSchema,
    maxCandidates: z.number().int().min(1).max(20),
  }),
  outputSchema: z.object({
    criteria: searchCriteriaSchema,
    maxCandidates: z.number().int().min(1).max(20),
    error: z.string().nullable(),
    people: z.array(personSchema),
  }),
  execute: async ({ inputData, mastra }) => {
    const { criteria, maxCandidates } = inputData;
    const peopleAgent = mastra.getAgent('recruiterWorkflowPeopleResearchAgent');
    const searchResponse = await peopleAgent.generate(
      [
        {
          role: 'user',
          content: `Run a candidate calibration search using these fixed constraints.

Recruiter criteria:
${JSON.stringify(
  {
    role: criteria.role,
    companies: criteria.companies,
    locations: criteria.locations,
    seniority: criteria.seniority,
    linkedinOnly: criteria.linkedinOnly,
  },
  null,
  2,
)}

Queries to run (use these exact queries unless one fails):
${criteria.queries.map((query, index) => `${index + 1}. ${query}`).join('\n')}

Rules:
- Use peopleSearchTool for each query.
- Source candidates only from tool results. Never fabricate any candidate fields.
- Require a valid LinkedIn URL for every returned candidate.
- Deduplicate by URL.
- Keep only strong matches to the criteria.
- Exclude candidates at the recruiting company when that company is explicitly identifiable.
- If fewer than ${maxCandidates} qualified candidates are found, return the real count and explain shortfall in error.
- If file-writing capability is unavailable, do not claim results were saved to files.
- Return JSON only.`,
        },
      ],
      {
        structuredOutput: {
          schema: z.object({
            queries: z.array(z.string()),
            error: z.string().nullable(),
            people: z.array(personSchema),
          }),
        },
        maxSteps: 12,
      },
    );

    const seenUrls = new Set<string>();
    const foundPeople = searchResponse.object.people.filter(person => {
      const urlKey = person.url.toLowerCase();
      if (seenUrls.has(urlKey)) {
        return false;
      }
      seenUrls.add(urlKey);
      return true;
    });
    const normalizedQueries = normalizeQueries(searchResponse.object.queries);

    const rankedPeople = foundPeople
      .map(person => ({
        person,
        score: scoreCandidate(person, criteria),
      }))
      .sort((left, right) => right.score - left.score)
      .map(item => item.person)
      .slice(0, maxCandidates);

    return {
      criteria: {
        ...criteria,
        queries: normalizedQueries.length ? normalizedQueries : criteria.queries,
      },
      maxCandidates,
      error: searchResponse.object.error,
      people: rankedPeople,
    };
  },
});

const summarizeCandidatesStep = createStep({
  id: 'summarize-candidates',
  inputSchema: z.object({
    criteria: searchCriteriaSchema,
    maxCandidates: z.number().int().min(1).max(20),
    error: z.string().nullable(),
    people: z.array(personSchema),
  }),
  outputSchema: recruiterWorkflowOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const summaryAgent = mastra.getAgent('recruiterWorkflowCandidateSummaryAgent');
    const candidates: z.infer<typeof recruiterCandidateSchema>[] = [];

    for (const person of inputData.people) {
      const fallbackName = person.author || person.title || 'Unknown candidate';
      const fallbackHeadline = person.title || 'No headline available';

      try {
        const response = await summaryAgent.generate(
          [
            {
              role: 'user',
              content: `Summarize this candidate for a recruiter.

Candidate metadata:
- title: ${person.title}
- author: ${person.author ?? 'unknown'}
- url: ${person.url}
- summary: ${person.summary ?? 'none'}

Candidate content:
${person.content.slice(0, 3000)}`,
            },
          ],
          {
            structuredOutput: {
              schema: candidateSummarySchema,
            },
            maxSteps: 2,
          },
        );

        candidates.push({
          ...response.object,
          linkedinUrl: person.url,
        });
      } catch {
        candidates.push({
          name: fallbackName,
          headline: fallbackHeadline,
          skillsSummary: person.summary || 'Limited data available to infer key skills.',
          experienceSummary: person.content
            ? `${person.content.slice(0, 200)}${person.content.length > 200 ? '...' : ''}`
            : 'Limited profile detail available.',
          linkedinUrl: person.url,
        });
      }
    }

    return {
      criteria: {
        role: inputData.criteria.role,
        companies: inputData.criteria.companies,
        locations: inputData.criteria.locations,
        seniority: inputData.criteria.seniority,
        linkedinOnly: inputData.criteria.linkedinOnly,
      },
      queries: inputData.criteria.queries,
      error: inputData.error,
      candidates,
    };
  },
});

export const recruiterCandidateWorkflow = createWorkflow({
  id: 'recruiter-candidate-workflow',
  inputSchema: recruiterWorkflowInputSchema,
  outputSchema: recruiterWorkflowOutputSchema,
  steps: [defineSearchCriteriaStep, runCandidateSearchStep, summarizeCandidatesStep],
});

recruiterCandidateWorkflow.then(defineSearchCriteriaStep).then(runCandidateSearchStep).then(summarizeCandidatesStep).commit();
