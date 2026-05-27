import Link from 'next/link';
import { getObservabilitySessions } from '@deep-research/mastra';
import { AppShell } from '../../../components/ui/app-shell';
import { Panel } from '../../../components/ui/panel';
import { Pill } from '../../../components/ui/pill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const formatValue = (value: unknown) => (value === null || value === undefined ? '' : String(value));

export default async function SessionsPage() {
  const sessions = await getObservabilitySessions();

  return (
    <AppShell subtitle="Grouped session and conversation journeys across recruiter searches.">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-[color:var(--text-tertiary)] uppercase">Sessions</h2>
          <Link className="text-sm text-[color:var(--link-primary)]" href="/observability">
            Dashboard
          </Link>
        </div>

        {sessions.map(session => (
          <Panel key={`${session.sessionId}-${session.conversationId}`} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                  {session.sessionId} / {session.conversationId}
                </div>
                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                  {session.startedAt} to {session.lastSeenAt}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                  User: {session.userEmail || session.userName || session.userId || 'Unknown'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="blue">{session.requestCount} requests</Pill>
                <Pill tone={session.failureCount > 0 ? 'orange' : 'neutral'}>{session.failureCount} failures</Pill>
                <Pill tone="neutral">{session.totalCandidates} candidates</Pill>
              </div>
            </div>

            <p className="mt-3 text-sm text-[color:var(--text-secondary)]">{session.latestQuery ?? 'No query captured'}</p>

            <div className="mt-4 space-y-2">
              {session.requests.map(request => (
                <div
                  key={request.requestId}
                  className="grid gap-2 rounded-lg border border-[color:var(--border-soft)] p-3 text-sm md:grid-cols-[160px_80px_1fr_140px]"
                >
                  <span className="text-xs text-[color:var(--text-tertiary)]">{request.completedAt}</span>
                  <span>{request.statusCode}</span>
                  <span className="truncate text-[color:var(--text-secondary)]">{formatValue(request.userQuery)}</span>
                  <Link className="text-[color:var(--link-primary)]" href={`/observability/requests/${request.requestId}`}>
                    View request
                  </Link>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </section>
    </AppShell>
  );
}
