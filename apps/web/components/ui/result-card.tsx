import { type ReactNode } from 'react';
import { Panel } from './panel';
import { cn } from './cn';

type ResultCardProps = {
  children: ReactNode;
  className?: string;
};

export function ResultCard({ children, className }: ResultCardProps) {
  return (
    <Panel
      as="article"
      tone="muted"
      className={cn(
        'rounded-lg border-[color:var(--border-soft)] p-4 transition hover:border-[color:var(--accent-primary-soft)] hover:shadow-[0_14px_34px_-30px_var(--shadow-accent)] sm:p-5',
        className,
      )}
    >
      {children}
    </Panel>
  );
}
