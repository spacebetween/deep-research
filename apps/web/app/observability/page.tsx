import Link from 'next/link';
import { getObservabilitySummary } from '@deep-research/mastra';
import { AppShell } from '../../components/ui/app-shell';
import { Panel } from '../../components/ui/panel';
import { Pill } from '../../components/ui/pill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const formatValue = (value: unknown) => (value === null || value === undefined ? '' : String(value));

const formatNumber = (value: unknown) => Number(value ?? 0).toLocaleString();

type RequestTimelinePoint = {
  bucketStart: string;
  label: string;
  total: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
};

const statusSegments = [
  { key: 'status2xx', label: '2xx', color: '#25d18a' },
  { key: 'status3xx', label: '3xx', color: '#5ca8ff' },
  { key: 'status4xx', label: '4xx', color: '#ffb84d' },
  { key: 'status5xx', label: '5xx', color: '#ff5f72' },
] as const;

function RequestsOverTimeChart({ points }: { points: RequestTimelinePoint[] }) {
  const chartWidth = 960;
  const chartHeight = 240;
  const padding = { top: 18, right: 18, bottom: 34, left: 40 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const maxTotal = Math.max(1, ...points.map(point => point.total));
  const barGap = 5;
  const barWidth = Math.max(12, plotWidth / Math.max(1, points.length) - barGap);
  const tickValues = [maxTotal, Math.ceil(maxTotal / 2), 0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {statusSegments.map(segment => (
          <div key={segment.key} className="flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: segment.color }} />
            {segment.label}
          </div>
        ))}
      </div>

      <div className="app-scrollbar overflow-x-auto">
        <svg
          role="img"
          aria-label="Requests over time by status code family"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="min-w-[760px]"
        >
          <title>Requests over time by status code family</title>
          {tickValues.map(value => {
            const y = padding.top + plotHeight - (value / maxTotal) * plotHeight;
            return (
              <g key={`tick-${value}`}>
                <line
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                  stroke="color-mix(in srgb, var(--border-soft) 70%, transparent)"
                />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-[color:var(--text-tertiary)] text-[10px]">
                  {value}
                </text>
              </g>
            );
          })}

          {points.map((point, index) => {
            const x = padding.left + index * (plotWidth / Math.max(1, points.length)) + barGap / 2;
            let stackedHeight = 0;

            return (
              <g key={point.bucketStart}>
                {statusSegments.map(segment => {
                  const value = point[segment.key];
                  if (!value) return null;

                  const height = (value / maxTotal) * plotHeight;
                  const y = padding.top + plotHeight - stackedHeight - height;
                  stackedHeight += height;

                  return (
                    <rect
                      key={segment.key}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(1, height)}
                      fill={segment.color}
                      rx="3"
                    />
                  );
                })}
                {index % 4 === 0 || index === points.length - 1 ? (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    className="fill-[color:var(--text-tertiary)] text-[10px]"
                  >
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default async function ObservabilityPage() {
  const summary = await getObservabilitySummary();
  const totals = summary.totals as Record<string, unknown>;
  const requestTimeline = summary.requestTimeline as RequestTimelinePoint[];

  return (
    <AppShell subtitle="Request volume, session history, agent results, tool calls, and failure signals.">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Overview</h2>
          <Link className="text-sm text-[color:var(--link-primary)]" href="/observability/sessions">
            Sessions
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Panel className="p-4">
            <div className="text-xs font-medium tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">Requests</div>
            <div className="mt-2 text-2xl font-semibold">{formatNumber(totals.request_count)}</div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs font-medium tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">Failures</div>
            <div className="mt-2 text-2xl font-semibold">{formatNumber(totals.failed_count)}</div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs font-medium tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">Clarifications</div>
            <div className="mt-2 text-2xl font-semibold">{formatNumber(totals.clarification_count)}</div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs font-medium tracking-[0.14em] text-[color:var(--text-tertiary)] uppercase">Empty Results</div>
            <div className="mt-2 text-2xl font-semibold">{formatNumber(totals.empty_result_count)}</div>
          </Panel>
        </div>

        <Panel className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">
                Requests Over Time
              </h2>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)]">Hourly request volume over the last 24 hours by status code family.</p>
            </div>
            <Pill tone="neutral">Last 24h</Pill>
          </div>
          <RequestsOverTimeChart points={requestTimeline} />
        </Panel>

        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Recent Requests</h2>
            <Pill tone={summary.enabled ? 'blue' : 'neutral'}>{summary.enabled ? 'Enabled' : 'Disabled'}</Pill>
          </div>
          <div className="app-scrollbar overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-xs tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">
                <tr>
                  <th className="py-2 pr-4">Completed</th>
                  <th className="py-2 pr-4">Route</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Ms</th>
                  <th className="py-2 pr-4">Candidates</th>
                  <th className="py-2 pr-4">Query</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentRequests.map((request, index) => (
                  <tr key={`${formatValue(request.request_id)}-${index}`} className="border-t border-[color:var(--border-soft)]">
                    <td className="py-2 pr-4 text-[color:var(--text-secondary)]">{formatValue(request.completed_at)}</td>
                    <td className="py-2 pr-4">{formatValue(request.route)}</td>
                    <td className="max-w-[220px] truncate py-2 pr-4 text-[color:var(--text-secondary)]">
                      {formatValue(request.user_email || request.user_name || request.user_id)}
                    </td>
                    <td className="py-2 pr-4">{formatValue(request.status_code)}</td>
                    <td className="py-2 pr-4">{formatValue(request.response_type)}</td>
                    <td className="py-2 pr-4">{formatValue(request.duration_ms)}</td>
                    <td className="py-2 pr-4">{formatValue(request.candidate_count)}</td>
                    <td className="max-w-[360px] truncate py-2 pr-4 text-[color:var(--text-secondary)]">
                      <Link className="text-[color:var(--link-primary)]" href={`/observability/requests/${formatValue(request.request_id)}`}>
                        {formatValue(request.user_query) || formatValue(request.request_id)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Slowest Requests</h2>
            <div className="space-y-2">
              {summary.slowRequests.map((request, index) => (
                <div key={`${formatValue(request.request_id)}-slow-${index}`} className="rounded-lg border border-[color:var(--border-soft)] p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{formatValue(request.route)}</span>
                    <Pill tone="neutral">{formatValue(request.duration_ms)} ms</Pill>
                  </div>
                  <p className="mt-2 truncate text-xs text-[color:var(--text-secondary)]">{formatValue(request.user_query)}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Recent Tool Calls</h2>
            <div className="space-y-2">
              {summary.toolCalls.map((toolCall, index) => (
                <div key={`${formatValue(toolCall.created_at)}-tool-${index}`} className="rounded-lg border border-[color:var(--border-soft)] p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{formatValue(toolCall.tool_name)}</span>
                    <Pill tone={toolCall.error_message ? 'neutral' : 'blue'}>{formatValue(toolCall.returned_count)} results</Pill>
                  </div>
                  <p className="mt-2 truncate text-xs text-[color:var(--text-secondary)]">{formatValue(toolCall.query)}</p>
                  {toolCall.error_message ? (
                    <p className="mt-1 text-xs text-[color:var(--status-danger-text)]">{formatValue(toolCall.error_message)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="p-4">
          <h2 className="mb-3 text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Recent Clicks And Feedback</h2>
          <div className="space-y-2">
            {summary.recentEvents.map((event, index) => (
              <div key={`${formatValue(event.created_at)}-event-${index}`} className="grid gap-2 rounded-lg border border-[color:var(--border-soft)] p-3 text-sm md:grid-cols-[160px_180px_180px_1fr_140px]">
                <span className="text-xs text-[color:var(--text-tertiary)]">{formatValue(event.created_at)}</span>
                <span>{formatValue(event.event_type)}</span>
                <span className="truncate text-[color:var(--text-secondary)]">
                  {formatValue(event.user_email || event.user_name || event.user_id)}
                </span>
                <span className="truncate text-[color:var(--text-secondary)]">
                  {formatValue(event.feedback_value || event.candidate_url)}
                </span>
                {event.request_id ? (
                  <Link className="text-[color:var(--link-primary)]" href={`/observability/requests/${formatValue(event.request_id)}`}>
                    View request
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}
