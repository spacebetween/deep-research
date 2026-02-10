import { type ReactNode } from 'react';
import { cn } from './cn';

type PillTone = 'neutral' | 'blue' | 'orange';

type PillProps = {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
};

const toneClasses: Record<PillTone, string> = {
  neutral:
    'border-[color:var(--pill-neutral-border)] bg-[color:var(--pill-neutral-bg)] text-[color:var(--pill-neutral-text)]',
  blue: 'border-[color:var(--accent-primary-soft)] bg-[color:var(--status-neutral-bg)] text-[color:var(--pill-primary-text)]',
  orange: 'border-[color:var(--danger-soft)] bg-[color:var(--status-danger-bg)] text-[color:var(--pill-danger-text)]',
};

export function Pill({ children, tone = 'neutral', className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-xs font-medium leading-5 tracking-[0.01em] sm:text-[0.8rem]',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
