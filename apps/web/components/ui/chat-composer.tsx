'use client';

import { FormEvent, KeyboardEvent, useId, useState } from 'react';
import { cn } from './cn';
import { StatusBadge } from './status-badge';

type ChatComposerProps = {
  value: string;
  status: string;
  placeholder: string;
  textareaLabel: string;
  submitLabel: string;
  submitShortcutLabel?: string;
  loadingLabel?: string;
  isLoading: boolean;
  onChange: (nextValue: string) => void;
  onSubmit: () => void | Promise<void>;
  className?: string;
  textareaMinHeightClassName?: string;
};

export function ChatComposer({
  value,
  status,
  placeholder,
  textareaLabel,
  submitLabel,
  submitShortcutLabel = 'Ctrl+Enter',
  loadingLabel = 'Working...',
  isLoading,
  onChange,
  onSubmit,
  className,
  textareaMinHeightClassName = 'min-h-28',
}: ChatComposerProps) {
  const textareaId = useId();
  const [isComposing, setIsComposing] = useState(false);
  const canSubmit = !isLoading && value.trim().length > 0;

  const submitIfPossible = () => {
    if (!canSubmit || isComposing) {
      return;
    }

    onSubmit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitIfPossible();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    if (!(event.metaKey || event.ctrlKey)) {
      return;
    }

    if (event.nativeEvent.isComposing || isComposing) {
      return;
    }

    event.preventDefault();
    submitIfPossible();
  };

  return (
    <form className={cn('border-t border-[color:var(--border-soft)] p-4 sm:p-5', className)} onSubmit={handleSubmit}>
      <label htmlFor={textareaId} className="sr-only">
        {textareaLabel}
      </label>

      <textarea
        id={textareaId}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        disabled={isLoading}
        className={cn(
          textareaMinHeightClassName,
          'w-full resize-y rounded-xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm leading-relaxed text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-70',
        )}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusBadge status={status} />
        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'rounded-full bg-[image:var(--gradient-unicorn)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_20px_36px_-24px_var(--shadow-accent)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-55',
            isLoading && 'unicorn-shimmer',
          )}
        >
          <span className="flex items-center gap-2">
            <span>{isLoading ? loadingLabel : submitLabel}</span>
            {!isLoading ? (
              <span className="rounded-md border border-white/30 bg-white/10 px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-white/90">
                {submitShortcutLabel}
              </span>
            ) : null}
          </span>
        </button>
      </div>
    </form>
  );
}
