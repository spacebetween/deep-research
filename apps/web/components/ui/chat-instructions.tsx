import { cn } from './cn';

type ChatInstructionsProps = {
  title: string;
  description: string;
  badge?: string;
  className?: string;
};

export function ChatInstructions({
  title,
  description,
  badge = 'Instructions',
  className,
}: ChatInstructionsProps) {
  return (
    <section className={cn('border-b border-[color:var(--border-soft)] p-4 sm:p-5', className)}>
      <div className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-panel-muted)] px-4 py-3.5">
        <div className="inline-flex rounded-full bg-[color:var(--surface-elevated)] px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase">
          {badge}
        </div>
        <h3 className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
        <p className="mt-1 text-sm leading-7 text-[color:var(--text-secondary)]">{description}</p>
      </div>
    </section>
  );
}
