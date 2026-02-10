'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { AppShell } from '../../components/ui/app-shell';
import { ChatComposer } from '../../components/ui/chat-composer';
import { ChatMessage } from '../../components/ui/chat-message';
import { Panel } from '../../components/ui/panel';
import { Pill } from '../../components/ui/pill';
import { ResultCard } from '../../components/ui/result-card';

type ConversationMessage = {
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

const initialMessage: ConversationMessage = {
  role: 'assistant',
  content:
    'Name the profile archetype and Bad Unicorn will expose strong LinkedIn matches. Example: "Find 8 Senior Product Managers at B2B SaaS companies in Boston."',
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
  const [messages, setMessages] = useState<ConversationMessage[]>([initialMessage]);
  const [status, setStatus] = useState('Ready');

  const historyForApi = useMemo(
    () => messages.filter(message => message.role === 'user' || message.role === 'assistant'),
    [messages],
  );

  const latestResult = useMemo(() => {
    return [...messages].reverse().find(message => message.result)?.result ?? null;
  }, [messages]);

  async function onSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setMessages(current => [...current, { role: 'user', content: trimmed }]);
    setIsLoading(true);
    setStatus('Revealing candidate matches...');

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
    <AppShell
      title="Bad Unicorn Match Vault"
      subtitle="Interrogate peopleResearchAgent and surface high-signal LinkedIn candidates in real time."
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
                  label={message.role === 'user' ? 'You' : 'Agent'}
                  content={message.displayContent ?? message.content}
                />
              ))}
            </div>

            <ChatComposer
              value={input}
              status={status}
              placeholder='Describe role, company DNA, location, and seniority. Example: "Staff Data Engineer at fintech companies in Chicago"'
              textareaLabel="Recruiter search input"
              submitLabel="Reveal Matches"
              isLoading={isLoading}
              onChange={setInput}
              onSubmit={onSubmit}
              textareaMinHeightClassName="min-h-24"
            />
          </Panel>
        </section>

        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-2">
          <h2 className="px-1 text-xs font-medium tracking-[0.16em] text-[color:var(--text-tertiary)] uppercase">Search Results</h2>
          <Panel className="app-scrollbar min-h-0 overflow-y-auto p-4 sm:p-5">
            {!latestResult ? (
              <p className="text-sm text-[color:var(--text-secondary)]">
                Run a query in chat to see candidate matches and search queries.
              </p>
            ) : (
              <div className="space-y-5">
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
                    Candidates ({latestResult.people.length})
                  </h3>
                  <div className="space-y-2.5">
                    {latestResult.people.length === 0 ? (
                      <p className="text-sm text-[color:var(--text-secondary)]">No candidates returned for the latest request.</p>
                    ) : (
                      latestResult.people.map((person, index) => {
                        const domain = getDomain(person.url);
                        const isLinkedIn = domain.includes('linkedin.com');

                        return (
                          <ResultCard key={`${person.url}-${index}`}>
                            <div className="flex items-start justify-between gap-3">
                              <a
                                href={person.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-semibold text-[color:var(--link-primary)] transition hover:text-[color:var(--link-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)]"
                              >
                                {person.title}
                              </a>
                              <Pill tone={isLinkedIn ? 'blue' : 'neutral'}>{isLinkedIn ? 'LinkedIn' : domain}</Pill>
                            </div>
                            <div className="mt-2 text-xs text-[color:var(--text-tertiary)]">{person.author || 'Unknown profile'}</div>
                            <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                              {trimContent(person.summary || person.content || 'No summary available.')}
                            </p>
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
