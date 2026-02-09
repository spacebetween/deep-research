'use client';

import { FormEvent, useMemo, useState } from 'react';
import { z } from 'zod';
import styles from './page.module.css';

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

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  result?: RecruiterWorkflowResult;
};

const initialMessage: ChatMessage = {
  role: 'assistant',
  content:
    'Tell me which LinkedIn candidates you need. Example: "Find 8 Senior Product Managers at B2B SaaS companies in Boston."',
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
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [status, setStatus] = useState('Ready');

  const latestResult = useMemo(() => {
    return [...messages].reverse().find(message => message.result)?.result ?? null;
  }, [messages]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setMessages(current => [...current, { role: 'user', content: trimmed }]);
    setIsLoading(true);
    setStatus('Defining criteria and searching candidates...');

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
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recruiter Workflow Workspace</h1>
        <p className={styles.subtitle}>Chat on the left, workflow-driven candidate summaries on the right.</p>
      </header>

      <section className={styles.workspace}>
        <section className={styles.column}>
          <h2 className={styles.columnTitle}>Chat</h2>
          <div className={styles.chatShell}>
            <div className={styles.messages}>
              {messages.map((message, index) => (
                <article key={`${message.role}-${index}`} className={`${styles.message} ${styles[message.role]}`}>
                  <div className={styles.meta}>{message.role === 'user' ? 'You' : 'Workflow'}</div>
                  <div>{message.displayContent ?? message.content}</div>
                </article>
              ))}
            </div>

            <form className={styles.composer} onSubmit={onSubmit}>
              <textarea
                value={input}
                placeholder='Describe role, company, location, and seniority. Example: "Staff Data Engineer at fintech companies in Chicago"'
                onChange={event => setInput(event.target.value)}
                disabled={isLoading}
              />
              <div className={styles.controls}>
                <div className={styles.status}>{status}</div>
                <button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? 'Working...' : 'Search'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className={styles.column}>
          <h2 className={styles.columnTitle}>Workflow Results</h2>
          <div className={styles.resultsShell}>
            {!latestResult ? (
              <p className={styles.emptyState}>Run a query in chat to see criteria, queries, and candidate summaries.</p>
            ) : (
              <>
                <div className={styles.sectionTitle}>Search Criteria</div>
                <div className={styles.criteriaList}>
                  <span className={styles.queryPill}>Role: {latestResult.criteria.role}</span>
                  {latestResult.criteria.seniority ? (
                    <span className={styles.queryPill}>Seniority: {latestResult.criteria.seniority}</span>
                  ) : null}
                  <span className={styles.queryPill}>LinkedIn only: {latestResult.criteria.linkedinOnly ? 'Yes' : 'No'}</span>
                  {latestResult.criteria.companies.map((company, index) => (
                    <span key={`${company}-${index}`} className={styles.queryPill}>
                      Company: {company}
                    </span>
                  ))}
                  {latestResult.criteria.locations.map((location, index) => (
                    <span key={`${location}-${index}`} className={styles.queryPill}>
                      Location: {location}
                    </span>
                  ))}
                </div>

                <div className={styles.sectionTitle}>Queries</div>
                <div className={styles.queryList}>
                  {latestResult.queries.map((query, index) => (
                    <span key={`${query}-${index}`} className={styles.queryPill}>
                      {query}
                    </span>
                  ))}
                </div>

                {latestResult.error ? <p className={styles.error}>Tool warning: {latestResult.error}</p> : null}

                <div className={styles.sectionTitle}>Candidates ({latestResult.candidates.length})</div>
                <div className={styles.cardList}>
                  {latestResult.candidates.length === 0 ? (
                    <p className={styles.emptyState}>No candidates returned for the latest request.</p>
                  ) : (
                    latestResult.candidates.map((candidate, index) => (
                      <article key={`${candidate.linkedinUrl}-${index}`} className={styles.card}>
                        <div className={styles.cardHeader}>
                          <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className={styles.cardLink}>
                            {candidate.name}
                          </a>
                          <span className={`${styles.badge} ${styles.linkedin}`}>LinkedIn</span>
                        </div>
                        <div className={styles.cardMeta}>{candidate.headline}</div>
                        <p className={styles.cardSummary}>
                          <strong>Skills:</strong> {candidate.skillsSummary}
                        </p>
                        <p className={styles.cardSummary}>
                          <strong>Experience:</strong> {candidate.experienceSummary}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
