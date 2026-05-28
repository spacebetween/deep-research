'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createConversationId, getOrCreateSessionId, trackUserEvent } from '../../lib/client-observability';
import {
  agentApiResponseSchema,
  legacyRecruiterApiResponseSchema,
  type AgentApiResponse,
  type ConversationMessage,
  type RecruiterAgentResult,
  type RecruiterCandidate,
} from './types';
import {
  buildActiveSignals,
  buildAgentSummary,
  estimateFitScore,
  formatMissingFields,
  getCandidateLocation,
  getInitials,
  getResultStatusCopy,
  splitExperienceSummary,
  splitSkillsSummary,
} from './view-model';

const feedbackOptions = [
  { value: 'useful_shortlist', label: 'Useful results' },
  { value: 'wrong_profile_type', label: 'Wrong profile type' },
  { value: 'too_broad', label: 'Too broad' },
  { value: 'too_few_candidates', label: 'Too few candidates' },
  { value: 'bad_location', label: 'Bad location' },
  { value: 'missing_required_skills', label: 'Missing skills' },
] as const;

const workspaceTabs = ['AI Chat', 'Query'] as const;

const samplePrompts = [
  'Find mechanical engineerings in Surrey with CNC machine experience',
  'Find profiles similar to a LinkedIn URL and explain the strongest shared signals.',
  'Source London insurance underwriters with digital transformation experience.',
];

type SessionResponse = {
  user?: {
    name?: string | null;
    email?: string | null;
  };
};

const getFirstName = (session: SessionResponse | null) => {
  const displayName = session?.user?.name?.trim();
  if (displayName) return displayName.split(/\s+/)[0];

  const emailName = session?.user?.email?.split('@')[0]?.trim();
  if (!emailName) return null;

  const [firstSegment] = emailName.split(/[._-]+/);
  return firstSegment ? firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1) : null;
};

export default function AgentPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [status, setStatus] = useState('Ready');
  const [activeSidebarTab, setActiveSidebarTab] = useState<(typeof workspaceTabs)[number]>('AI Chat');
  const [firstName, setFirstName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submittedFeedback, setSubmittedFeedback] = useState<Record<string, string>>({});
  const conversationIdRef = useRef<string | null>(null);
  const signalsRef = useRef<HTMLElement | null>(null);
  const autoRunStartedRef = useRef(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    const nextSessionId = getOrCreateSessionId();
    setSessionId(nextSessionId);
    conversationIdRef.current = createConversationId();

    if (autoRunStartedRef.current || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const autoRunPrompt = params.get('prompt')?.trim();
    const shouldAutoRun = params.get('autorun') === '1';
    if (!shouldAutoRun || !autoRunPrompt) return;

    autoRunStartedRef.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    void submitPrompt(autoRunPrompt, nextSessionId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSessionName() {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) return;

        const session = (await response.json()) as SessionResponse;
        const nextFirstName = getFirstName(session);
        if (isMounted) setFirstName(nextFirstName);
      } catch {
        if (isMounted) setFirstName(null);
      }
    }

    void loadSessionName();

    return () => {
      isMounted = false;
    };
  }, []);

  const historyForApi = useMemo(
    () => messages.map(message => ({ role: message.role, content: message.content })),
    [messages],
  );

  const latestAssistantState = useMemo(() => {
    return (
      [...messages]
        .reverse()
        .find(message => message.role === 'assistant' && (message.result || message.clarification)) ?? null
    );
  }, [messages]);

  const latestResult = latestAssistantState?.result ?? null;
  const latestClarification = latestAssistantState?.clarification ?? null;
  const latestRequestId = latestAssistantState?.requestId;
  const latestFeedbackKey = latestRequestId ?? 'latest-result';
  const activeSignals = useMemo(() => buildActiveSignals(latestResult), [latestResult]);
  const resultStatusCopy = getResultStatusCopy(latestResult, isLoading);
  const candidateLocation = getCandidateLocation(latestResult);
  const canSubmit = !isLoading && input.trim().length > 0;

  async function submitPrompt(prompt: string, nextSessionId = sessionId) {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setMessages(current => [...current, { role: 'user', content: trimmed }]);
    setIsLoading(true);
    setStatus('Building candidate signals...');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          maxCandidates: 5,
          messages: [...historyForApi, { role: 'user', content: trimmed }],
          sessionId: nextSessionId,
          conversationId: conversationIdRef.current,
        }),
      });

      const payload = await response.json();
      const requestId = response.headers.get('x-request-id') ?? undefined;

      if (!response.ok) {
        const maybeError = payload && typeof payload === 'object' ? (payload as { error?: string }).error : null;
        throw new Error(maybeError || 'Request failed');
      }

      let agentResponse: AgentApiResponse | null = null;
      const parsedEnvelope = agentApiResponseSchema.safeParse(payload);
      if (parsedEnvelope.success) {
        agentResponse = parsedEnvelope.data;
      } else {
        const parsedLegacy = legacyRecruiterApiResponseSchema.safeParse(payload);
        if (parsedLegacy.success) {
          agentResponse = {
            responseType: 'results',
            assistantMessage: buildAgentSummary(parsedLegacy.data.result),
            clarification: null,
            result: parsedLegacy.data.result,
          };
        }
      }

      if (!agentResponse) {
        throw new Error('Unexpected response format from /api/agent');
      }

      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: agentResponse.assistantMessage,
          requestId,
          responseType: agentResponse.responseType,
          clarification: agentResponse.clarification ?? undefined,
          result: agentResponse.result ?? undefined,
        },
      ]);

      const missingFields = agentResponse.clarification?.missingFields ?? [];
      if (missingFields.length > 0) {
        setStatus(`Awaiting ${formatMissingFields(missingFields)} clarification`);
      } else {
        setStatus('Ready');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setMessages(current => [...current, { role: 'assistant', content: `Error: ${message}` }]);
      setStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit() {
    await submitPrompt(input);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
    if (event.nativeEvent.isComposing || isComposing) return;
    event.preventDefault();
    void onSubmit();
  }

  function resetSearch() {
    setInput('');
    setMessages([]);
    setStatus('Ready');
    setSubmittedFeedback({});
    setActiveSidebarTab('AI Chat');
    conversationIdRef.current = createConversationId();
  }

  async function copyResultSummary() {
    if (!latestResult) return;

    const lines = [
      `Bad Unicorn search: ${latestResult.criteria.role}`,
      `Candidates: ${latestResult.candidates.length}`,
      '',
      ...latestResult.candidates.map((candidate, index) => {
        const score = estimateFitScore(candidate, index);
        return `${index + 1}. ${candidate.name} (${score}% match) - ${candidate.headline} - ${candidate.linkedinUrl}`;
      }),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatus('Results copied');
    } catch {
      setStatus('Copy unavailable');
    }
  }

  function trackLinkedInClick(candidate: RecruiterCandidate, requestId?: string) {
    trackUserEvent({
      requestId,
      sessionId,
      conversationId: conversationIdRef.current,
      eventType: 'linkedin_click',
      candidateUrl: candidate.linkedinUrl,
      metadata: {
        candidateName: candidate.name,
        headline: candidate.headline,
      },
    });
  }

  function submitFeedback(value: (typeof feedbackOptions)[number]['value'], requestId?: string) {
    const feedbackKey = requestId ?? 'latest-result';
    setSubmittedFeedback(current => ({ ...current, [feedbackKey]: value }));

    if (!requestId) return;
    trackUserEvent({
      requestId,
      sessionId,
      conversationId: conversationIdRef.current,
      eventType: 'result_feedback',
      feedbackValue: value,
      metadata: {
        candidateCount: latestResult?.candidates.length ?? 0,
        responseType: latestAssistantState?.responseType ?? null,
      },
    });
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#100c16] text-[#e9dfee] lg:h-screen lg:min-h-0">
      <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row">
        <aside className="flex h-auto shrink-0 flex-col border-b border-[#4d4354]/70 bg-[#1e1a24] lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#4d4354] bg-[#221e28]">
                <Image src="/unicornlogo.png" alt="Bad Unicorn logo" width={36} height={36} className="h-9 w-9 object-contain" priority />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-[#ddb7ff]">Bad Unicorn</h1>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-b border-[#4d4354]/60 px-4 pb-3" aria-label="Workspace views">
            {workspaceTabs.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSidebarTab(tab)}
                className={
                  activeSidebarTab === tab
                    ? 'shrink-0 rounded-md bg-[#b76dff] px-3 py-1.5 text-xs font-semibold text-[#1c082d]'
                    : 'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-[#cfc2d6] transition hover:bg-[#38333e] hover:text-[#e9dfee]'
                }
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="app-scrollbar flex min-h-[260px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:min-h-0">
            <SidebarTabContent
              activeTab={activeSidebarTab}
              messages={messages}
              result={latestResult}
              activeSignals={activeSignals}
              firstName={firstName}
              onUsePrompt={setInput}
            />
          </div>

          <form className="border-t border-[#4d4354]/60 p-4" onSubmit={handleSubmit}>
            <label htmlFor="agent-input" className="sr-only">
              Talk to Bad Unicorn
            </label>
            <div className="relative">
              <input
                id="agent-input"
                value={input}
                type="text"
                placeholder="Talk to Bad Unicorn..."
                disabled={isLoading}
                onChange={event => setInput(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                className="w-full rounded-full border border-[#4d4354] bg-[#38333e] py-3 pl-4 pr-12 text-sm text-[#e9dfee] placeholder:text-[#988d9f] transition focus:border-[#ddb7ff] focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/20 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                aria-label="Send search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#b76dff] text-sm font-bold text-[#1c082d] transition hover:bg-[#ddb7ff] focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Go
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[#cfc2d6]">{status}</div>
              <button
                type="button"
                onClick={resetSearch}
                className="rounded border border-[#ddb7ff]/30 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#ddb7ff] transition hover:bg-[#ddb7ff]/10"
              >
                New Search
              </button>
            </div>
          </form>
        </aside>

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#100c16] lg:ml-80 lg:h-screen">
          <div className="pointer-events-none absolute left-1/4 top-0 h-80 w-80 rounded-full bg-[#ddb7ff]/5 blur-3xl" aria-hidden />
          <header className="sticky top-0 z-10 flex shrink-0 flex-col gap-4 border-b border-[#4d4354]/40 bg-[#100c16]/90 px-5 py-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <div className="mt-2 flex items-center gap-2 text-sm text-[#cfc2d6]">
                <span className={`h-2 w-2 rounded-full ${isLoading || latestResult ? 'bg-[#4ae176]' : 'bg-[#988d9f]'}`} />
                <span>{resultStatusCopy}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!latestResult}
                onClick={() => void copyResultSummary()}
                className="rounded-full border border-[#4d4354] px-3 py-2 text-xs font-medium text-[#cfc2d6] transition hover:bg-[#221e28] hover:text-[#e9dfee] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Copy
              </button>
            </div>
          </header>

          <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 lg:px-8">
            <section ref={signalsRef} className="mb-6 scroll-mt-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#ddb7ff]" />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ddb7ff]">What I'm looking for</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeSignals.map(signal => (
                  <span key={signal} className="rounded-full border border-[#4d4354] bg-[#38333e]/60 px-3 py-1.5 text-xs text-[#e9dfee]">
                    {signal}
                  </span>
                ))}
              </div>
            </section>

            {latestClarification ? <ClarificationPanel clarification={latestClarification} /> : null}
            {latestResult?.error ? <WarningPanel error={latestResult.error} /> : null}

            {!latestResult ? (
              <EmptyResultsState isLoading={isLoading} />
            ) : (
              <>
                <CandidateGrid
                  result={latestResult}
                  candidateLocation={candidateLocation}
                  requestId={latestRequestId}
                  onLinkedInClick={trackLinkedInClick}
                />
                <FeedbackPanel
                  requestId={latestRequestId}
                  selectedValue={submittedFeedback[latestFeedbackKey]}
                  onSelect={submitFeedback}
                />
              </>
            )}
          </div>
          <footer className="shrink-0 border-t border-[#4d4354]/40 bg-[#100c16]/95 px-5 py-4 text-xs text-[#cfc2d6] lg:px-8">
            <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Workspace footer">
              <p>Recruiter intelligence</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/observability" className="font-medium text-[#ddb7ff] transition hover:text-[#f0dbff]">
                  Observability
                </Link>
                <a href="#help" className="font-medium text-[#ddb7ff] transition hover:text-[#f0dbff]">
                  Help
                </a>
              </div>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  );
}

function SidebarTabContent({
  activeTab,
  messages,
  result,
  activeSignals,
  firstName,
  onUsePrompt,
}: {
  activeTab: (typeof workspaceTabs)[number];
  messages: ConversationMessage[];
  result: RecruiterAgentResult | null;
  activeSignals: string[];
  firstName: string | null;
  onUsePrompt: (prompt: string) => void;
}) {
  if (activeTab === 'Query') {
    return <QuerySidebar activeSignals={activeSignals} result={result} />;
  }

  if (messages.length === 0) {
    return <EmptyChatState firstName={firstName} onUsePrompt={onUsePrompt} />;
  }

  return messages.map((message, index) => (
    <ChatBubble key={`${message.role}-${index}`} message={message} />
  ));
}

function EmptyChatState({ firstName, onUsePrompt }: { firstName: string | null; onUsePrompt: (prompt: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#4d4354] bg-[#221e28] p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4ae176]">
          {firstName ? `Hi ${firstName}` : 'Hi'}
        </div>
        <p className="text-sm leading-6 text-[#cfc2d6]">
          Give me a brief, LinkedIn profile, or somethin to search. If I'm missing anything I'll let you know.
        </p>
      </div>
      <div className="space-y-2">
        {samplePrompts.map(prompt => (
          <button
            key={prompt}
            type="button"
            onClick={() => onUsePrompt(prompt)}
            className="block w-full rounded-lg border border-[#4d4354]/70 bg-[#16111c] p-3 text-left text-xs leading-5 text-[#cfc2d6] transition hover:border-[#ddb7ff]/50 hover:text-[#e9dfee]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuerySidebar({ activeSignals, result }: { activeSignals: string[]; result: RecruiterAgentResult | null }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#4d4354] bg-[#221e28] p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ddb7ff]">Signals</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeSignals.map(signal => (
            <span key={signal} className="rounded-full border border-[#4d4354] bg-[#38333e] px-2 py-1 text-[11px] text-[#e9dfee]">
              {signal}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-[#4d4354] bg-[#16111c] p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfc2d6]">Queries</h2>
        {result?.queries.length ? (
          <ol className="mt-3 space-y-2 text-xs leading-5 text-[#cfc2d6]">
            {result.queries.slice(0, 5).map((query, index) => (
              <li key={`${query}-${index}`}>{query}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[#988d9f]">Run a search to see the agent query strategy.</p>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';

  return (
    <article
      className={
        isUser
          ? 'ml-auto max-w-[90%] rounded-xl rounded-tr-sm border border-[#4d4354]/60 bg-[#38333e]/60 p-3 text-sm leading-6 text-[#e9dfee]'
          : 'mr-auto max-w-[95%] rounded-xl rounded-tl-sm border border-[#4d4354] bg-[#16111c] p-3 text-sm leading-6 text-[#cfc2d6]'
      }
    >
      {!isUser ? (
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4ae176]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4ae176]" />
          Analysis
        </div>
      ) : null}
      <p className="whitespace-pre-wrap">{message.content}</p>
    </article>
  );
}

function ClarificationPanel({ clarification }: { clarification: NonNullable<ConversationMessage['clarification']> }) {
  return (
    <section className="mb-6 rounded-lg border border-[#4ae176]/30 bg-[#4ae176]/10 p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4ae176]">Awaiting Clarification</h3>
      {clarification.missingFields.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {clarification.missingFields.map(field => (
            <span key={field} className="rounded-full border border-[#4ae176]/30 px-3 py-1 text-xs text-[#d9ffe3]">
              Missing: {field}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 space-y-2 text-sm leading-6 text-[#d9ffe3]">
        {clarification.questions.length > 0 ? (
          clarification.questions.map((question, index) => <p key={`${question}-${index}`}>{question}</p>)
        ) : (
          <p>Share missing location or skills details to tighten the next pass.</p>
        )}
      </div>
    </section>
  );
}

function WarningPanel({ error }: { error: string }) {
  return (
    <section className="mb-6 rounded-lg border border-[#ffb2b7]/30 bg-[#ff516a]/10 p-4 text-sm text-[#ffdadb]">
      <span className="font-semibold">Tool warning:</span> {error}
    </section>
  );
}

function EmptyResultsState({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return <BadUnicornLoadingState />;
  }

  return (
    <section className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-[#4d4354] bg-[#16111c]/70 p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 h-2 w-20 rounded-full bg-[#ddb7ff]/60" />
        <h3 className="text-xl font-semibold text-[#e9dfee]">No results yet</h3>
        <p className="mt-2 text-sm leading-6 text-[#cfc2d6]">Run a search in chat to populate intelligence signals, clarifying questions, and candidate cards.</p>
      </div>
    </section>
  );
}

function BadUnicornLoadingState() {
  const loadingSteps = ['Reading the brief', 'Sniffing out signal', 'Tuning the search', 'Ranking candidates'];

  return (
    <section
      className="bad-unicorn-loader relative min-h-[420px] overflow-hidden rounded-lg border border-[#ddb7ff]/25 bg-[#16111c] p-6 text-center sm:p-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 bad-unicorn-loader-grid opacity-70" aria-hidden />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bad-unicorn-loader-scan" aria-hidden />

      <div className="relative z-[1] mx-auto flex max-w-3xl flex-col items-center">
        <div className="bad-unicorn-loader-stage relative grid h-36 w-36 place-items-center sm:h-44 sm:w-44" aria-hidden>
          <div className="bad-unicorn-loader-ring absolute inset-0 rounded-full" />
          <div className="bad-unicorn-loader-ring bad-unicorn-loader-ring-inner absolute inset-4 rounded-full" />
          <div className="bad-unicorn-loader-logo grid h-20 w-20 place-items-center rounded-2xl border border-[#4d4354] bg-[#221e28] shadow-[0_0_40px_rgba(221,183,255,0.18)] sm:h-24 sm:w-24">
            <Image src="/unicornlogo.png" alt="" width={72} height={72} className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
          </div>
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4ae176]">Bad Unicorn is searching</p>
        <h3 className="mt-2 text-2xl font-semibold text-[#e9dfee] sm:text-3xl">Building candidate results</h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#cfc2d6]">
          Pulling profile evidence into shape while the agent searches, compares signals, and ranks the strongest matches.
        </p>

        <div className="mt-6 grid w-full gap-3 sm:grid-cols-4">
          {loadingSteps.map((step, index) => (
            <div key={step} className="rounded-lg border border-[#4d4354] bg-[#221e28]/80 p-3 text-left">
              <div className="mb-3 flex h-8 items-end gap-1.5" aria-hidden>
                {[0, 1, 2, 3].map(bar => (
                  <span
                    key={`${step}-${bar}`}
                    className="bad-unicorn-loader-bar block w-full rounded-sm bg-[#ddb7ff]"
                    style={{ animationDelay: `${(index * 0.12 + bar * 0.08).toFixed(2)}s` }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#e9dfee]">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CandidateGrid({
  result,
  candidateLocation,
  requestId,
  onLinkedInClick,
}: {
  result: RecruiterAgentResult;
  candidateLocation: string;
  requestId?: string;
  onLinkedInClick: (candidate: RecruiterCandidate, requestId?: string) => void;
}) {
  if (result.candidates.length === 0) {
    return (
      <section className="rounded-lg border border-[#4d4354] bg-[#16111c] p-6 text-sm text-[#cfc2d6]">
        No candidates returned for the latest request.
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {result.candidates.map((candidate, index) => (
        <CandidateCard
          key={`${candidate.linkedinUrl}-${index}`}
          candidate={candidate}
          index={index}
          location={candidateLocation}
          requestId={requestId}
          onLinkedInClick={onLinkedInClick}
        />
      ))}
    </section>
  );
}

function CandidateCard({
  candidate,
  index,
  location,
  requestId,
  onLinkedInClick,
}: {
  candidate: RecruiterCandidate;
  index: number;
  location: string;
  requestId?: string;
  onLinkedInClick: (candidate: RecruiterCandidate, requestId?: string) => void;
}) {
  const skills = splitSkillsSummary(candidate.skillsSummary);
  const experienceHighlights = splitExperienceSummary(candidate.experienceSummary);
  const score = estimateFitScore(candidate, index);

  return (
    <article className="group relative flex min-h-[260px] flex-col overflow-hidden rounded-lg border border-[#4d4354] bg-[#16111c]/80 p-5 transition hover:border-[#ddb7ff]/50 hover:bg-[#221e28]/80">
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-[#4ae176]/5 transition group-hover:bg-[#4ae176]/10" aria-hidden />
      <div className="relative z-[1] flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#4d4354] bg-[#38333e] text-sm font-semibold text-[#cfc2d6]">
            {getInitials(candidate.name)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-[#e9dfee] transition group-hover:text-[#ddb7ff]">{candidate.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#cfc2d6]">{candidate.headline}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="rounded border border-[#4ae176]/30 bg-[#4ae176]/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6bff8f]">
            {score}% match
          </div>
          <div className="mt-1 max-w-32 truncate text-[11px] text-[#988d9f]">{location}</div>
        </div>
      </div>

      <div className="relative z-[1] mt-4 flex flex-wrap gap-1.5">
        {(skills.length > 0 ? skills : [candidate.skillsSummary]).slice(0, 5).map((skill, skillIndex) => (
          <span
            key={`${candidate.linkedinUrl}-skill-${skillIndex}`}
            className={`rounded border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.06em] ${
              skillIndex === 0
                ? 'border-[#ddb7ff]/30 bg-[#ddb7ff]/10 text-[#ddb7ff]'
                : 'border-[#4d4354] bg-[#38333e] text-[#e9dfee]'
            }`}
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="relative z-[1] mt-4 flex-1 border-t border-[#4d4354]/60 pt-4">
        <p className="line-clamp-3 text-sm leading-6 text-[#cfc2d6]">
          {experienceHighlights[0] || candidate.experienceSummary || 'No experience summary provided.'}
        </p>
      </div>

      <div className="relative z-[1] mt-4 flex items-center justify-between gap-3">
        <a
          href={candidate.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => onLinkedInClick(candidate, requestId)}
          className="truncate text-xs font-medium text-[#ddb7ff] transition hover:text-[#f0dbff] focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50"
        >
          LinkedIn profile
        </a>
        <span className="rounded-full border border-[#4d4354] px-2 py-1 text-[11px] text-[#cfc2d6]">Source returned</span>
      </div>
    </article>
  );
}

function FeedbackPanel({
  requestId,
  selectedValue,
  onSelect,
}: {
  requestId?: string;
  selectedValue?: string;
  onSelect: (value: (typeof feedbackOptions)[number]['value'], requestId?: string) => void;
}) {
  return (
    <section className="mt-6 rounded-lg border border-[#4d4354] bg-[#16111c] p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#cfc2d6]">Result Quality</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {feedbackOptions.map(option => {
          const selected = selectedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value, requestId)}
              className={
                selected
                  ? 'rounded-md border border-[#ddb7ff]/40 bg-[#ddb7ff]/15 px-3 py-1.5 text-xs font-medium text-[#ddb7ff]'
                  : 'rounded-md border border-[#4d4354] bg-[#221e28] px-3 py-1.5 text-xs font-medium text-[#cfc2d6] transition hover:border-[#ddb7ff]/40 hover:text-[#e9dfee]'
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
