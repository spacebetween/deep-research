import { cn } from './cn';

type StatusBadgeProps = {
  status: string;
};

type StatusTone = {
  shell: string;
  dot: string;
  pulse: boolean;
};

const getTone = (status: string): StatusTone => {
  const normalized = status.toLowerCase();

  if (normalized.includes('fail') || normalized.includes('error')) {
    return {
      shell: 'border-[color:var(--danger-soft)] bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-text)]',
      dot: 'bg-[color:var(--danger)]',
      pulse: false,
    };
  }

  if (normalized.includes('done') || normalized.includes('ready')) {
    return {
      shell: 'border-[color:var(--border-soft)] bg-[color:var(--status-neutral-bg)] text-[color:var(--status-neutral-text)]',
      dot: 'bg-[color:var(--accent-primary)]',
      pulse: false,
    };
  }

  return {
    shell: 'border-[color:var(--accent-secondary-soft)] bg-[color:var(--status-info-bg)] text-[color:var(--status-info-text)]',
    dot: 'bg-[color:var(--accent-secondary)]',
    pulse: true,
  };
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = getTone(status);

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.05em]',
        tone.shell,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot, tone.pulse && 'animate-pulse')} aria-hidden />
      {status}
    </span>
  );
}
