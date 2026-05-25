import { type ElementType, type ReactNode } from 'react';
import { cn } from './cn';

type PanelTone = 'default' | 'muted' | 'accent';

type PanelProps = {
  as?: ElementType;
  tone?: PanelTone;
  className?: string;
  children: ReactNode;
};

const toneClasses: Record<PanelTone, string> = {
  default: 'border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)]',
  muted: 'border border-[color:var(--border-soft)] bg-[color:var(--bg-panel-muted)]',
  accent: 'border border-[color:var(--border-strong)] bg-[image:var(--gradient-panel-accent)]',
};

export function Panel({ as: Component = 'section', tone = 'default', className, children }: PanelProps) {
  return (
    <Component
      className={cn(
        'rounded-lg shadow-[0_12px_34px_-30px_var(--shadow-color)] transition-colors',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </Component>
  );
}
