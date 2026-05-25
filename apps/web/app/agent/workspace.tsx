'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { AppShell } from '../../components/ui/app-shell';
import { ChatComposer } from '../../components/ui/chat-composer';
import { ChatMessage } from '../../components/ui/chat-message';
import { cn } from '../../components/ui/cn';
import {
  buildActivity,
  buildAgentSummary,
  buildBriefScore,
  buildCandidateViewModels,
  buildChangedChips,
  candidateId,
  progressSteps,
} from './view-model';
import {
  type AgentApiResponse,
  type AgentClarification,
  type CandidateDecision,
  type CandidateViewModel,
  type ConversationMessage,
  type RecruiterAgentResult,
} from './types';

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

const recruiterAgentResultSchema = z.object({
  criteria: recruiterCriteriaSchema,
  queries: z.array(z.string()),
  error: z.string().nullable(),
  candidates: z.array(recruiterCandidateSchema),
});

const clarificationFieldSchema = z.enum(['location', 'skills']);

const agentClarificationSchema = z.object({
  missingFields: z.array(clarificationFieldSchema),
  questions: z.array(z.string()),
});

const agentApiResponseSchema = z.object({
  responseType: z.enum(['clarification', 'results', 'results_with_clarification']),
  assistantMessage: z.string().min(1),
  clarification: agentClarificationSchema.nullable(),
  result: recruiterAgentResultSchema.nullable(),
});

const legacyRecruiterApiResponseSchema = z.object({
  result: recruiterAgentResultSchema,
});

type WorkspaceMode = 'calibration' | 'evidence';

const modeCopy: Record<WorkspaceMode, { label: string; description: string }> = {
  calibration: {
    label: 'Calibration Loop',
    description: 'Turn a rough brief into a defensible shortlist through targeted agent questions.',
  },
  evidence: {
    label: 'Evidence Board',
    description: 'Compare candidates, inspect source confidence, and capture recruiter notes.',
  },
};

const formatMissingFields = (fields: AgentClarification['missingFields']) => {
  const uniqueFields = [...new Set(fields)];
  if (uniqueFields.length === 0) return 'details';
  if (uniqueFields.length === 2) return 'location and skills';
  return uniqueFields[0] === 'location' ? 'location' : 'skills';
};

function MetricBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[color:var(--text-secondary)]">{label}</span>
        <span className="font-mono text-[color:var(--signal-strong)]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-[color:var(--surface-track)]">
        <div className="h-full rounded bg-[color:var(--signal-strong)]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function WorkspacePanel({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)]', className)}>
      <div className="border-b border-[color:var(--border-soft)] px-4 py-3">
        {eyebrow ? <div className="mb-1 text-[0.68rem] font-semibold tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">{eyebrow}</div> : null}
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SmallChip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'signal' | 'danger' }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded border px-2 py-1 text-[0.72rem] font-medium leading-none',
        tone === 'neutral' && 'border-[color:var(--border-soft)] bg-[color:var(--bg-panel-muted)] text-[color:var(--text-secondary)]',
        tone === 'accent' && 'border-[color:var(--accent-primary-soft)] bg-[color:var(--accent-primary-subtle)] text-[color:var(--accent-primary)]',
        tone === 'signal' && 'border-[color:var(--signal-soft)] bg-[color:var(--signal-bg)] text-[color:var(--signal-strong)]',
        tone === 'danger' && 'border-[color:var(--danger-soft)] bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-text)]',
      )}
    >
      {children}
    </span>
  );
}

function CandidateActions({
  vm,
  onDecision,
  onToggleCompare,
}: {
  vm: CandidateViewModel;
  onDecision: (id: string, decision: CandidateDecision) => void;
  onToggleCompare: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onDecision(vm.id, 'saved')}
        className={cn(
          'rounded border px-2.5 py-1.5 text-xs font-semibold transition',
          vm.decision === 'saved'
            ? 'border-[color:var(--signal-soft)] bg-[color:var(--signal-bg)] text-[color:var(--signal-strong)]'
            : 'border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:border-[color:var(--signal-soft)] hover:text-[color:var(--signal-strong)]',
        )}
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => onDecision(vm.id, 'rejected')}
        className={cn(
          'rounded border px-2.5 py-1.5 text-xs font-semibold transition',
          vm.decision === 'rejected'
            ? 'border-[color:var(--danger-soft)] bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-text)]'
            : 'border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:border-[color:var(--danger-soft)] hover:text-[color:var(--status-danger-text)]',
        )}
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() => onToggleCompare(vm.id)}
        className={cn(
          'rounded border px-2.5 py-1.5 text-xs font-semibold transition',
          vm.isCompared
            ? 'border-[color:var(--accent-primary-soft)] bg-[color:var(--accent-primary-subtle)] text-[color:var(--accent-primary)]'
            : 'border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent-primary-soft)] hover:text-[color:var(--accent-primary)]',
        )}
      >
        Compare
      </button>
    </div>
  );
}

function CandidateRow({
  vm,
  onSelect,
  onDecision,
  onToggleCompare,
}: {
  vm: CandidateViewModel;
  onSelect: (id: string) => void;
  onDecision: (id: string, decision: CandidateDecision) => void;
  onToggleCompare: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        'rounded-lg border bg-[color:var(--bg-panel)] p-3 transition',
        vm.isSelected ? 'border-[color:var(--accent-primary-soft)] shadow-[0_10px_24px_-20px_var(--shadow-accent)]' : 'border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)]',
      )}
    >
      <button type="button" onClick={() => onSelect(vm.id)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{vm.candidate.name}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--text-tertiary)]">{vm.candidate.headline}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-lg font-semibold text-[color:var(--signal-strong)]">{vm.fitScore}%</div>
            <div className="text-[0.65rem] font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Fit</div>
          </div>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <SmallChip tone={vm.decision === 'saved' ? 'signal' : vm.decision === 'rejected' ? 'danger' : 'neutral'}>
          {vm.decision === 'new' ? 'New' : vm.decision}
        </SmallChip>
        <SmallChip tone="accent">LinkedIn</SmallChip>
        <SmallChip tone={vm.sourceConfidence > 84 ? 'signal' : 'neutral'}>{vm.sourceConfidence}% source</SmallChip>
      </div>
      <div className="mt-3">
        <CandidateActions vm={vm} onDecision={onDecision} onToggleCompare={onToggleCompare} />
      </div>
    </article>
  );
}

function CandidateInspector({ vm, note, onNoteChange }: { vm: CandidateViewModel | null; note: string; onNoteChange: (id: string, value: string) => void }) {
  if (!vm) {
    return (
      <div className="p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
        Run a search and select a candidate. The inspector will show fit signals, gaps, source confidence, and notes.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[color:var(--text-primary)]">{vm.candidate.name}</h3>
            <a
              href={vm.candidate.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-xs text-[color:var(--link-primary)] hover:text-[color:var(--link-primary-hover)]"
            >
              {vm.candidate.linkedinUrl}
            </a>
          </div>
          <SmallChip tone={vm.fitScore > 86 ? 'signal' : 'accent'}>{vm.fitScore}% fit</SmallChip>
        </div>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">{vm.candidate.headline}</p>
      </div>

      <MetricBar label="Source confidence" value={vm.sourceConfidence} />

      <div className="grid gap-3 sm:grid-cols-2">
        <EvidenceList title="The goods" items={vm.strengths} tone="signal" />
        <EvidenceList title="The gaps" items={vm.gaps} tone="danger" />
      </div>

      <section>
        <h4 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Evidence</h4>
        <div className="flex flex-wrap gap-1.5">
          {vm.evidence.map((item, index) => (
            <SmallChip key={`${vm.id}-evidence-${index}`} tone={index === 0 ? 'accent' : 'neutral'}>
              {item}
            </SmallChip>
          ))}
        </div>
      </section>

      <section>
        <label htmlFor={`candidate-note-${vm.index}`} className="mb-2 block text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">
          Recruiter notes
        </label>
        <textarea
          id={`candidate-note-${vm.index}`}
          value={note}
          onChange={event => onNoteChange(vm.id, event.target.value)}
          placeholder="Capture client-fit notes, outreach angle, or why this one smells expensive."
          className="min-h-24 w-full resize-y rounded border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        />
      </section>
    </div>
  );
}

function EvidenceList({ title, items, tone }: { title: string; items: string[]; tone: 'signal' | 'danger' }) {
  return (
    <section className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-panel-muted)] p-3">
      <h4 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">{title}</h4>
      <ul className="space-y-2 text-xs leading-5 text-[color:var(--text-secondary)]">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', tone === 'signal' ? 'bg-[color:var(--signal-strong)]' : 'bg-[color:var(--danger)]')} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CriteriaPanel({ result, clarification }: { result: RecruiterAgentResult | null; clarification: AgentClarification | null }) {
  const changedChips = buildChangedChips(result, clarification);

  return (
    <div className="space-y-4 p-4">
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">What changed</h3>
        <div className="flex flex-wrap gap-1.5">
          {changedChips.map((chip, index) => (
            <SmallChip key={`${chip}-${index}`} tone={chip.startsWith('Missing') ? 'danger' : index === 0 ? 'accent' : 'neutral'}>
              {chip}
            </SmallChip>
          ))}
        </div>
      </section>

      {clarification ? (
        <section className="rounded-lg border border-[color:var(--signal-soft)] bg-[color:var(--signal-bg)] p-3">
          <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--signal-strong)] uppercase">Missing context</h3>
          <ul className="space-y-1 text-sm leading-6 text-[color:var(--text-primary)]">
            {clarification.questions.length ? (
              clarification.questions.map((question, index) => <li key={`question-${index}`}>{question}</li>)
            ) : (
              <li>Give the agent the missing location or skills detail and it will tighten the net.</li>
            )}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Criteria</h3>
        {result ? (
          <div className="grid gap-2 text-sm">
            <CriteriaRow label="Role" value={result.criteria.role || 'Not set'} />
            <CriteriaRow label="Seniority" value={result.criteria.seniority || 'Inferred'} />
            <CriteriaRow label="Locations" value={result.criteria.locations.join(', ') || 'Not pinned'} />
            <CriteriaRow label="Companies" value={result.criteria.companies.join(', ') || 'Open market'} />
            <CriteriaRow label="LinkedIn only" value={result.criteria.linkedinOnly ? 'Yes' : 'No'} />
          </div>
        ) : (
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">Drop a rough role brief and the agent will extract criteria here.</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Queries</h3>
        {result?.queries.length ? (
          <div className="space-y-2">
            {result.queries.map((query, index) => (
              <div key={`${query}-${index}`} className="rounded border border-[color:var(--border-soft)] bg-[color:var(--bg-panel-muted)] px-3 py-2 font-mono text-xs leading-5 text-[color:var(--text-secondary)]">
                {query}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">Generated search strings will land here.</p>
        )}
      </section>
    </div>
  );
}

function CriteriaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3 rounded border border-[color:var(--border-soft)] bg-[color:var(--bg-panel-muted)] px-3 py-2">
      <div className="text-xs font-semibold tracking-[0.08em] text-[color:var(--text-tertiary)] uppercase">{label}</div>
      <div className="min-w-0 truncate text-[color:var(--text-primary)]">{value}</div>
    </div>
  );
}

function ActivityTimeline({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 text-xs leading-5 text-[color:var(--text-secondary)]">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--accent-primary)]" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function AgentWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>('calibration');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [status, setStatus] = useState('Ready');
  const [progressIndex, setProgressIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, CandidateDecision>>({});
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading) {
      setProgressIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setProgressIndex(current => Math.min(current + 1, progressSteps.length - 1));
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  const historyForApi = useMemo(() => messages.map(message => ({ role: message.role, content: message.content })), [messages]);

  const latestAssistantState = useMemo(() => {
    return [...messages].reverse().find(message => message.role === 'assistant' && (message.result || message.clarification)) ?? null;
  }, [messages]);

  const latestResult = latestAssistantState?.result ?? null;
  const latestClarification = latestAssistantState?.clarification ?? null;
  const candidateViewModels = useMemo(
    () => buildCandidateViewModels(latestResult, decisions, comparisonIds, selectedId),
    [comparisonIds, decisions, latestResult, selectedId],
  );
  const selectedCandidate = candidateViewModels.find(vm => vm.id === selectedId) ?? candidateViewModels[0] ?? null;
  const comparisonCandidates = candidateViewModels.filter(vm => vm.isCompared).slice(0, 3);
  const briefScore = buildBriefScore(latestResult, latestClarification);
  const timelineItems = buildActivity(latestResult, latestClarification, latestAssistantState?.responseType);
  const savedCount = candidateViewModels.filter(vm => vm.decision === 'saved').length;
  const rejectedCount = candidateViewModels.filter(vm => vm.decision === 'rejected').length;

  const updateDecision = (id: string, decision: CandidateDecision) => {
    setDecisions(current => ({ ...current, [id]: current[id] === decision ? 'new' : decision }));
  };

  const toggleCompare = (id: string) => {
    setComparisonIds(current => {
      if (current.includes(id)) return current.filter(candidateIdValue => candidateIdValue !== id);
      return [...current, id].slice(-3);
    });
  };

  async function onSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setMessages(current => [...current, { role: 'user', content: trimmed }]);
    setIsLoading(true);
    setStatus(progressSteps[0]);
    setProgressIndex(0);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          maxCandidates: 5,
          messages: [...historyForApi, { role: 'user', content: trimmed }],
        }),
      });

      const payload = await response.json();

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
          responseType: agentResponse.responseType,
          clarification: agentResponse.clarification ?? undefined,
          result: agentResponse.result ?? undefined,
        },
      ]);

      const firstCandidate = agentResponse.result?.candidates[0];
      if (firstCandidate) {
        setSelectedId(candidateId(firstCandidate));
      }

      const missingFields = agentResponse.clarification?.missingFields ?? [];
      if (missingFields.length > 0) {
        setStatus(`Awaiting ${formatMissingFields(missingFields)} clarification`);
      } else {
        setStatus('Done');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setMessages(current => [...current, { role: 'assistant', content: `Error: ${message}` }]);
      setStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading) {
      setStatus(progressSteps[progressIndex]);
    }
  }, [isLoading, progressIndex]);

  return (
    <AppShell subtitle="Cheeky, calibration-first candidate sourcing for recruiters who need evidence before vibes.">
      <div className="mb-4 grid gap-3 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-veil)] p-3 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="text-[0.68rem] font-semibold tracking-[0.16em] text-[color:var(--text-tertiary)] uppercase">Workspace mode</div>
          <h1 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">Bad Unicorn Sourcing Lab</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">
            Natural-language intake, calibrated search criteria, and a shortlist your client can actually argue with.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[430px]">
          {(['calibration', 'evidence'] as const).map(nextMode => (
            <button
              key={nextMode}
              type="button"
              onClick={() => setMode(nextMode)}
              className={cn(
                'rounded border px-3 py-2 text-left transition',
                mode === nextMode
                  ? 'border-[color:var(--accent-primary-soft)] bg-[color:var(--accent-primary-subtle)]'
                  : 'border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] hover:border-[color:var(--border-strong)]',
              )}
            >
              <span className="block text-sm font-semibold text-[color:var(--text-primary)]">{modeCopy[nextMode].label}</span>
              <span className="mt-1 block text-xs leading-5 text-[color:var(--text-secondary)]">{modeCopy[nextMode].description}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'calibration' ? (
        <section className="grid flex-1 gap-4 xl:min-h-[76vh] xl:grid-cols-[minmax(280px,0.8fr)_minmax(380px,1fr)_minmax(360px,1fr)]">
          <WorkspacePanel title="Brief calibration" eyebrow="Loop state" className="min-h-0 overflow-hidden">
            <div className="app-scrollbar max-h-[72vh] overflow-y-auto p-4">
              <div className="space-y-4">
                <MetricBar label="Brief quality" value={briefScore} />
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="Saved" value={savedCount} />
                  <StatBox label="Rejected" value={rejectedCount} />
                  <StatBox label="Compare" value={comparisonIds.length} />
                </div>
                <CriteriaPanel result={latestResult} clarification={latestClarification} />
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Agent conversation" eyebrow="Natural language" className="grid min-h-0 grid-rows-[1fr_auto] overflow-hidden">
            <div className="app-scrollbar flex min-h-[320px] flex-col gap-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-[color:var(--bg-panel-muted)] p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
                  Start rough. Try: "Need a Senior Data Engineer for fintech. Must know dbt and Snowflake." The agent will ask for missing context and still run a calibration pass.
                </div>
              ) : (
                messages.map((message, index) => (
                  <ChatMessage key={`${message.role}-${index}`} role={message.role} label={message.role === 'user' ? 'You' : 'Bad Unicorn'} content={message.content} />
                ))
              )}
            </div>
            <ChatComposer
              value={input}
              status={status}
              placeholder='Describe role, company DNA, location, and seniority. Example: "Staff Data Engineer at fintech companies in Chicago"'
              textareaLabel="Agent search input"
              submitLabel="Calibrate Search"
              loadingLabel={progressSteps[progressIndex]}
              isLoading={isLoading}
              onChange={setInput}
              onSubmit={onSubmit}
              textareaMinHeightClassName="min-h-24"
            />
          </WorkspacePanel>

          <WorkspacePanel title="Shortlist" eyebrow="Candidates" className="min-h-0 overflow-hidden">
            <div className="app-scrollbar max-h-[72vh] space-y-3 overflow-y-auto p-4">
              {latestResult?.error ? (
                <div className="rounded-lg border border-[color:var(--danger-soft)] bg-[color:var(--status-danger-bg)] p-3 text-sm text-[color:var(--status-danger-text)]">
                  Tool warning: {latestResult.error}
                </div>
              ) : null}
              {candidateViewModels.length ? (
                candidateViewModels.map(vm => (
                  <CandidateRow key={vm.id} vm={vm} onSelect={setSelectedId} onDecision={updateDecision} onToggleCompare={toggleCompare} />
                ))
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-secondary)]">Candidate cards will appear after the first agent pass. No fake unicorns in here.</p>
              )}
            </div>
          </WorkspacePanel>
        </section>
      ) : (
        <section className="grid flex-1 gap-4 xl:min-h-[76vh] xl:grid-cols-[minmax(260px,0.72fr)_minmax(520px,1.35fr)_minmax(340px,0.9fr)]">
          <WorkspacePanel title="Search timeline" eyebrow="Criteria trail" className="min-h-0 overflow-hidden">
            <div className="app-scrollbar max-h-[72vh] space-y-5 overflow-y-auto p-4">
              <MetricBar label="Brief quality" value={briefScore} />
              <ActivityTimeline items={timelineItems} />
              <CriteriaPanel result={latestResult} clarification={latestClarification} />
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Evidence board" eyebrow="Compare shortlist" className="min-h-0 overflow-hidden">
            <div className="app-scrollbar max-h-[72vh] overflow-y-auto p-4">
              {candidateViewModels.length ? (
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {(comparisonCandidates.length ? comparisonCandidates : candidateViewModels.slice(0, 3)).map(vm => (
                    <EvidenceCandidateCard
                      key={vm.id}
                      vm={vm}
                      note={notes[vm.id] ?? ''}
                      onSelect={setSelectedId}
                      onDecision={updateDecision}
                      onToggleCompare={toggleCompare}
                      onNoteChange={(id, value) => setNotes(current => ({ ...current, [id]: value }))}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-secondary)]">Run a query to populate side-by-side evidence. This board is for defending the shortlist, not decorating it.</p>
              )}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Candidate inspector" eyebrow="Evidence and notes" className="min-h-0 overflow-hidden">
            <div className="app-scrollbar max-h-[72vh] overflow-y-auto">
              <CandidateInspector
                vm={selectedCandidate}
                note={selectedCandidate ? notes[selectedCandidate.id] ?? '' : ''}
                onNoteChange={(id, value) => setNotes(current => ({ ...current, [id]: value }))}
              />
            </div>
          </WorkspacePanel>
        </section>
      )}
    </AppShell>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-panel-muted)] p-3">
      <div className="font-mono text-lg font-semibold text-[color:var(--text-primary)]">{value}</div>
      <div className="mt-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">{label}</div>
    </div>
  );
}

function EvidenceCandidateCard({
  vm,
  note,
  onSelect,
  onDecision,
  onToggleCompare,
  onNoteChange,
}: {
  vm: CandidateViewModel;
  note: string;
  onSelect: (id: string) => void;
  onDecision: (id: string, decision: CandidateDecision) => void;
  onToggleCompare: (id: string) => void;
  onNoteChange: (id: string, value: string) => void;
}) {
  return (
    <article
      className={cn(
        'rounded-lg border bg-[color:var(--bg-panel)] p-3',
        vm.isCompared ? 'border-[color:var(--accent-primary-soft)]' : 'border-[color:var(--border-soft)]',
      )}
    >
      <button type="button" onClick={() => onSelect(vm.id)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{vm.candidate.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--text-secondary)]">{vm.candidate.headline}</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold text-[color:var(--signal-strong)]">{vm.fitScore}%</div>
            <div className="text-[0.65rem] tracking-[0.1em] text-[color:var(--text-tertiary)] uppercase">Fit</div>
          </div>
        </div>
      </button>
      <div className="mt-3">
        <MetricBar label="Source confidence" value={vm.sourceConfidence} />
      </div>
      <div className="mt-3 grid gap-3">
        <EvidenceList title="The goods" items={vm.strengths} tone="signal" />
        <EvidenceList title="The gaps" items={vm.gaps} tone="danger" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {vm.evidence.slice(0, 4).map((item, index) => (
          <SmallChip key={`${vm.id}-compact-evidence-${index}`} tone={index === 0 ? 'accent' : 'neutral'}>
            {item}
          </SmallChip>
        ))}
      </div>
      <div className="mt-3">
        <CandidateActions vm={vm} onDecision={onDecision} onToggleCompare={onToggleCompare} />
      </div>
      <label htmlFor={`evidence-note-${vm.index}`} className="mt-3 block text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">
        Notes
      </label>
      <textarea
        id={`evidence-note-${vm.index}`}
        value={note}
        onChange={event => onNoteChange(vm.id, event.target.value)}
        placeholder="Outreach angle, client caveat, or why this one is worth the fee."
        className="mt-2 min-h-20 w-full resize-y rounded border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-3 py-2 text-xs leading-5 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      />
    </article>
  );
}
