import Link from 'next/link';
import { getObservabilityRequestDetail } from '@deep-research/mastra';
import { AppShell } from '../../../../components/ui/app-shell';
import { Panel } from '../../../../components/ui/panel';
import { Pill } from '../../../../components/ui/pill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RequestDetailPageProps = {
  params: Promise<{ requestId: string }>;
};

const formatValue = (value: unknown) => (value === null || value === undefined ? '' : String(value));

const parseJson = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="app-scrollbar overflow-x-auto rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-muted)] p-3 text-xs leading-relaxed text-[color:var(--text-secondary)]">
      {JSON.stringify(parseJson(value), null, 2)}
    </pre>
  );
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { requestId } = await params;

  const detail = await getObservabilityRequestDetail(requestId);

  if (!detail) {
    return (
      <AppShell subtitle="Request detail.">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Request not found</h2>
          <Link className="mt-3 inline-block text-sm text-[color:var(--link-primary)]" href="/observability/sessions">
            Back to sessions
          </Link>
        </Panel>
      </AppShell>
    );
  }

  const request = detail.request as Record<string, unknown>;

  return (
    <AppShell subtitle="Full query, response, criteria, searches, tool calls, candidates, clicks, and feedback.">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Request Detail</h2>
          <Link className="text-sm text-[color:var(--link-primary)]" href="/observability/sessions">
            Sessions
          </Link>
        </div>

        <Panel className="p-4">
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{formatValue(request.status_code)}</Pill>
            <Pill tone="neutral">{formatValue(request.response_type)}</Pill>
            <Pill tone="neutral">{formatValue(request.duration_ms)} ms</Pill>
            <Pill tone="neutral">{formatValue(request.candidate_count)} candidates</Pill>
          </div>
          <div className="mt-3 text-sm text-[color:var(--text-secondary)]">
            User: {formatValue(request.user_email || request.user_name || request.user_id || 'Unknown')}
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Full Query</h3>
              <p className="text-[color:var(--text-secondary)]">{formatValue(request.user_query)}</p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Assistant Response</h3>
              <p className="text-[color:var(--text-secondary)]">{formatValue(request.assistant_message)}</p>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="p-4">
            <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Criteria</h3>
            <JsonBlock value={request.criteria_json} />
          </Panel>
          <Panel className="p-4">
            <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Generated Searches</h3>
            <JsonBlock value={request.queries_json} />
          </Panel>
        </div>

        <Panel className="p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Conversation Messages</h3>
          <div className="space-y-2">
            {detail.messages.map((message, index) => (
              <div key={`message-${index}`} className="rounded-lg border border-[color:var(--border-soft)] p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-[color:var(--text-tertiary)]">{formatValue(message.role)}</div>
                <p className="whitespace-pre-wrap text-sm text-[color:var(--text-secondary)]">
                  {formatValue(message.content || message.content_summary)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Tool Calls</h3>
          <div className="space-y-2">
            {detail.toolCalls.map((toolCall, index) => (
              <div key={`tool-${index}`} className="rounded-lg border border-[color:var(--border-soft)] p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Pill tone="blue">{formatValue(toolCall.tool_name)}</Pill>
                  <Pill tone="neutral">{formatValue(toolCall.returned_count)} results</Pill>
                  <Pill tone="neutral">{formatValue(toolCall.duration_ms)} ms</Pill>
                </div>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{formatValue(toolCall.query)}</p>
                {toolCall.error_message ? <p className="mt-1 text-sm text-[color:var(--status-danger-text)]">{formatValue(toolCall.error_message)}</p> : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Candidates</h3>
          <div className="space-y-2">
            {detail.candidates.map((candidate, index) => (
              <div key={`candidate-${index}`} className="rounded-lg border border-[color:var(--border-soft)] p-3">
                <div className="font-semibold text-[color:var(--text-primary)]">{formatValue(candidate.name)}</div>
                <a className="text-xs text-[color:var(--link-primary)]" href={formatValue(candidate.linkedin_url)} target="_blank" rel="noreferrer">
                  {formatValue(candidate.linkedin_url)}
                </a>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{formatValue(candidate.headline)}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Clicks And Feedback</h3>
          <div className="space-y-2">
            {detail.events.map((event, index) => (
              <div key={`event-${index}`} className="grid gap-2 rounded-lg border border-[color:var(--border-soft)] p-3 text-sm md:grid-cols-[160px_160px_180px_1fr]">
                <span className="text-xs text-[color:var(--text-tertiary)]">{formatValue(event.created_at)}</span>
                <span>{formatValue(event.event_type)}</span>
                <span className="truncate text-[color:var(--text-secondary)]">
                  {formatValue(event.user_email || event.user_name || event.user_id)}
                </span>
                <span className="truncate text-[color:var(--text-secondary)]">
                  {formatValue(event.feedback_value || event.candidate_url)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}
