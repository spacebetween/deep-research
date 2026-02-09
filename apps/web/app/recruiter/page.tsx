'use client';

import { FormEvent, useMemo, useState } from 'react';
import { z } from 'zod';
import styles from './page.module.css';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  result?: PeopleResearchResult;
};

const personSchema = z.object({
  title: z.string(),
  url: z.string().min(1),
  author: z.string().nullable(),
  publishedDate: z.string().nullable(),
  summary: z.string().nullable(),
  content: z.string(),
});

const peopleResearchResultSchema = z.object({
  queries: z.array(z.string()),
  error: z.string().nullable(),
  people: z.array(personSchema),
});

type PeopleResearchResult = z.infer<typeof peopleResearchResultSchema>;

const initialMessage: ChatMessage = {
  role: 'assistant',
  content:
    'Tell me which LinkedIn candidates you want. Example: "Find 8 Senior Product Managers at B2B SaaS companies in Boston."',
};

const trimContent = (value: string, maxLength = 260) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
};

const buildAgentSummary = (result: PeopleResearchResult) => {
  const peopleCount = result.people.length;
  const queryCount = result.queries.length;

  if (result.error) {
    return `Completed ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and found ${peopleCount} people. Tool warning: ${result.error}`;
  }

  return `Completed ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'} and found ${peopleCount} people.`;
};

const parseAgentResult = (rawText: string): PeopleResearchResult | null => {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    const validated = peopleResearchResultSchema.safeParse(parsed);

    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return 'unknown';
  }
};

export default function RecruiterPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [status, setStatus] = useState('Ready');

  const historyForApi = useMemo(
    () => messages.filter(message => message.role === 'user' || message.role === 'assistant'),
    [messages],
  );

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
    setStatus('Searching LinkedIn candidates...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'peopleResearchAgent',
          messages: [...historyForApi, { role: 'user', content: trimmed }],
        }),
      });

      const payload = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || 'Request failed');
      }

      const result = parseAgentResult(payload.text);

      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: payload.text as string,
          displayContent: result ? buildAgentSummary(result) : payload.text,
          result: result ?? undefined,
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
        <h1 className={styles.title}>LinkedIn Recruiter Workspace</h1>
        <p className={styles.subtitle}>Chat with `peopleResearchAgent` and review candidate matches side-by-side.</p>
      </header>

      <section className={styles.workspace}>
        <section className={styles.column}>
          <h2 className={styles.columnTitle}>Chat</h2>
          <div className={styles.chatShell}>
            <div className={styles.messages}>
              {messages.map((message, index) => (
                <article key={`${message.role}-${index}`} className={`${styles.message} ${styles[message.role]}`}>
                  <div className={styles.meta}>{message.role === 'user' ? 'You' : 'Agent'}</div>
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
          <h2 className={styles.columnTitle}>Search Results</h2>
          <div className={styles.resultsShell}>
            {!latestResult ? (
              <p className={styles.emptyState}>Run a query in chat to see candidate matches and search queries.</p>
            ) : (
              <>
                <div className={styles.sectionTitle}>Queries</div>
                <div className={styles.queryList}>
                  {latestResult.queries.map((query, index) => (
                    <span key={`${query}-${index}`} className={styles.queryPill}>
                      {query}
                    </span>
                  ))}
                </div>

                {latestResult.error ? <p className={styles.error}>Tool warning: {latestResult.error}</p> : null}

                <div className={styles.sectionTitle}>Candidates ({latestResult.people.length})</div>
                <div className={styles.cardList}>
                  {latestResult.people.length === 0 ? (
                    <p className={styles.emptyState}>No candidates returned for the latest request.</p>
                  ) : (
                    latestResult.people.map((person, index) => {
                      const domain = getDomain(person.url);
                      const isLinkedIn = domain.includes('linkedin.com');

                      return (
                        <article key={`${person.url}-${index}`} className={styles.card}>
                          <div className={styles.cardHeader}>
                            <a href={person.url} target="_blank" rel="noreferrer" className={styles.cardLink}>
                              {person.title}
                            </a>
                            <span className={`${styles.badge} ${isLinkedIn ? styles.linkedin : styles.other}`}>
                              {isLinkedIn ? 'LinkedIn' : domain}
                            </span>
                          </div>
                          <div className={styles.cardMeta}>{person.author || 'Unknown profile'}</div>
                          <p className={styles.cardSummary}>
                            {trimContent(person.summary || person.content || 'No summary available.')}
                          </p>
                        </article>
                      );
                    })
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
