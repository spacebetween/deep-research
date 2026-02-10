'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { AppShell } from '../../components/ui/app-shell';
import { ChatComposer } from '../../components/ui/chat-composer';
import { ChatMessage } from '../../components/ui/chat-message';
import { Panel } from '../../components/ui/panel';
import { Pill } from '../../components/ui/pill';
import { ResultCard } from '../../components/ui/result-card';

const recruiterCriteriaSchema = z.object({
  role: z.string(),
  companies: z.array(z.string()),
  locations: z.array(z.string()),
  seniority: z.string().nullable(),
  linkedinOnly: z.boolean(),
});

const recruiterCandidateSchema = z.object({
  name: z.string(),
  headline: z.string(),
  skillsSummary: z.string(),
  experienceSummary: z.string(),
  linkedinUrl: z.string().min(1),
});

const recruiterWorkflowResultSchema = z.object({
  criteria: recruiterCriteriaSchema,
  queries: z.array(z.string()),
  error: z.string().nullable(),
  candidates: z.array(recruiterCandidateSchema),
});

const recruiterApiResponseSchema = z.object({
  result: recruiterWorkflowResultSchema,
});

type RecruiterWorkflowResult = z.infer<typeof recruiterWorkflowResultSchema>;

const splitSkillsSummary = (skillsSummary: string) => {
  const normalized = skillsSummary.trim();
  if (!normalized) return [];

  const hasStructuredDelimiters = /[\n\u2022;|]/.test(normalized);
  const segments = hasStructuredDelimiters
    ? normalized.split(/\r?\n|\u2022|;|\|/)
    : normalized.split(/,\s+/);

  return segments.map(segment => segment.trim()).filter(Boolean);
};

const splitExperienceSummary = (experienceSummary: string) => {
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

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  result?: RecruiterWorkflowResult;
};

const initialMessage: ConversationMessage = {
  role: 'assistant',
  content:
    'Define the hiring brief and Bad Unicorn will generate candidate intelligence. Example: "Find 8 Senior Product Managers at B2B SaaS companies in Boston."',
};

const buildWorkflowSummary = (result: RecruiterWorkflowResult) => {
  const queryCount = result.queries.length;
  const candidateCount = result.candidates.length;

  if (result.error) {
    return `Ran ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and returned ${candidateCount} candidates. Tool warning: ${result.error}`;
  }

  return `Ran ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and returned ${candidateCount} candidates.`;
};

export default function RecruitersPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([initialMessage]);
  const [status, setStatus] = useState('Ready');

  const latestResult = useMemo(() => {
    return [...messages].reverse().find(message => message.result)?.result ?? null;
  }, [messages]);

  async function onSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setMessages(current => [...current, { role: 'user', content: trimmed }]);
    setIsLoading(true);
    setStatus('Generating candidate shortlist...');

    try {
      const response = await fetch('/api/recruiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, maxCandidates: 8 }),
      });

      const payload = await response.json();
      const parsedPayload = recruiterApiResponseSchema.safeParse(payload);

      if (!response.ok || !parsedPayload.success) {
        const maybeError = payload && typeof payload === 'object' ? (payload as { error?: string }).error : null;
        throw new Error(maybeError || 'Request failed');
      }

      const result = parsedPayload.data.result;

      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: JSON.stringify(result),
          displayContent: buildWorkflowSummary(result),
          result,
        },
      ]);
      setStatus('Done');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setMessages(current => [...current, { role: 'assistant', content: `Error: ${message}` }]);
      setStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell
      subtitle="Unicorns found definetly not on LinkedIn"
    >
      <section className="grid flex-1 gap-4 lg:min-h-[76vh] lg:grid-cols-[minmax(320px,1fr)_minmax(380px,1fr)]">
        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-2">
          <h2 className="px-1 text-xs font-medium tracking-[0.16em] text-[color:var(--text-tertiary)] uppercase">Chat</h2>
          <Panel className="grid min-h-0 grid-rows-[1fr_auto] overflow-hidden">
            <div className="app-scrollbar flex min-h-0 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
              {messages.map((message, index) => (
                <ChatMessage
                  key={`${message.role}-${index}`}
                  role={message.role}
                  label={message.role === 'user' ? 'You' : 'Workflow'}
                  content={message.displayContent ?? message.content}
                />
              ))}
            </div>

            <ChatComposer
              value={input}
              status={status}
              placeholder='Describe role, company DNA, location, and seniority. Example: "Staff Data Engineer at fintech companies in Chicago"'
              textareaLabel="Workflow search input"
              submitLabel="Generate Candidates"
              isLoading={isLoading}
              onChange={setInput}
              onSubmit={onSubmit}
              textareaMinHeightClassName="min-h-24"
            />
          </Panel>
        </section>

        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-2">
          <h2 className="px-1 text-xs font-medium tracking-[0.16em] text-[color:var(--text-tertiary)] uppercase">Workflow Results</h2>
          <Panel className="app-scrollbar min-h-0 overflow-y-auto p-4 sm:p-5">
            {!latestResult ? (
              <p className="text-sm text-[color:var(--text-secondary)]">
                Run a query in chat to see criteria, queries, and candidate summaries.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h3 className="text-xs font-medium tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">Search Criteria</h3>
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="blue">Role: {latestResult.criteria.role}</Pill>
                    {latestResult.criteria.seniority ? <Pill tone="neutral">Seniority: {latestResult.criteria.seniority}</Pill> : null}
                    <Pill tone="neutral">LinkedIn only: {latestResult.criteria.linkedinOnly ? 'Yes' : 'No'}</Pill>
                    {latestResult.criteria.companies.map((company, index) => (
                      <Pill key={`${company}-${index}`} tone="neutral">
                        Company: {company}
                      </Pill>
                    ))}
                    {latestResult.criteria.locations.map((location, index) => (
                      <Pill key={`${location}-${index}`} tone="neutral">
                        Location: {location}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-medium tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">Queries</h3>
                  <div className="flex flex-wrap gap-2">
                    {latestResult.queries.map((query, index) => (
                      <Pill key={`${query}-${index}`} tone="blue">
                        {query}
                      </Pill>
                    ))}
                  </div>
                </div>

                {latestResult.error ? (
                  <p className="rounded-lg border border-[color:var(--danger-soft)] bg-[color:var(--status-danger-bg)] px-3 py-2 text-sm text-[color:var(--status-danger-text)]">
                    Tool warning: {latestResult.error}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <h3 className="text-xs font-medium tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">
                    Candidates ({latestResult.candidates.length})
                  </h3>
                  <div className="space-y-2.5">
                    {latestResult.candidates.length === 0 ? (
                      <p className="text-sm text-[color:var(--text-secondary)]">No candidates returned for the latest request.</p>
                    ) : (
                      latestResult.candidates.map((candidate, index) => {
                        const skills = splitSkillsSummary(candidate.skillsSummary);
                        const experienceHighlights = splitExperienceSummary(candidate.experienceSummary);

                        return (
                          <ResultCard key={`${candidate.linkedinUrl}-${index}`}>
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-[color:var(--text-primary)]">{candidate.name}</div>
                                  <a
                                    href={candidate.linkedinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-xs text-[color:var(--link-primary)] transition hover:text-[color:var(--link-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)]"
                                  >
                                    {candidate.linkedinUrl}
                                  </a>
                                </div>
                                <Pill tone="blue">LinkedIn</Pill>
                              </div>
                              <div className="text-xs text-[color:var(--text-tertiary)]">{candidate.headline}</div>
                              <section className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                                <strong className="text-[color:var(--text-primary)]">Skills:</strong>
                                {skills.length === 0 ? (
                                  <span className="ml-1">{candidate.skillsSummary}</span>
                                ) : (
                                  <ul className="mt-1 list-disc space-y-1 pl-5">
                                    {skills.map((skill, skillIndex) => (
                                      <li key={`${candidate.linkedinUrl}-skill-${skillIndex}`}>{skill}</li>
                                    ))}
                                  </ul>
                                )}
                              </section>
                              <section className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                                <strong className="text-[color:var(--text-primary)]">Experience:</strong>
                                {experienceHighlights.length === 0 ? (
                                  <p className="mt-1">No experience summary provided.</p>
                                ) : (
                                  <ul className="mt-1 list-disc space-y-1 pl-5">
                                    {experienceHighlights.map((item, itemIndex) => (
                                      <li key={`${candidate.linkedinUrl}-experience-${itemIndex}`}>{item}</li>
                                    ))}
                                  </ul>
                                )}
                              </section>
                            </div>
                          </ResultCard>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </section>
      </section>
    </AppShell>
  );
}
