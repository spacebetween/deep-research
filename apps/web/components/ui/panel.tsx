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
        'rounded-2xl shadow-[0_20px_60px_-38px_var(--shadow-color)] backdrop-blur-xl transition-colors',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </Component>
  );
}
