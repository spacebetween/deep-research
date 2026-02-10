import { cn } from './cn';

type MessageRole = 'user' | 'assistant';

type ChatMessageProps = {
  role: MessageRole;
  content: string;
  label?: string;
  className?: string;
};

const roleStyles: Record<MessageRole, { wrapper: string; bubble: string; label: string }> = {
  user: {
    wrapper: 'items-end',
    bubble:
      'border-[color:var(--accent-primary-soft)] bg-[image:var(--message-user-bg)] text-[color:var(--text-primary)] shadow-[0_22px_48px_-34px_var(--shadow-accent)]',
    label: 'bg-[color:var(--accent-primary-soft)] text-[color:var(--pill-primary-text)]',
  },
  assistant: {
    wrapper: 'items-start',
    bubble: 'border-[color:var(--message-assistant-border)] bg-[image:var(--message-assistant-bg)] text-[color:var(--text-secondary)]',
    label: 'bg-[color:var(--surface-elevated)] text-[color:var(--text-muted)]',
  },
};

export function ChatMessage({ role, content, label, className }: ChatMessageProps) {
  const roleStyle = roleStyles[role];

  return (
    <article className={cn('flex w-full', roleStyle.wrapper, className)}>
      <div className={cn('max-w-[94%] rounded-2xl border p-4 sm:max-w-[88%] sm:p-5', roleStyle.bubble)}>
        <div
          className={cn(
            'mb-2 inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.08em]',
            roleStyle.label,
          )}
        >
          {label ?? (role === 'user' ? 'You' : 'Agent')}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[0.96rem]">{content}</p>
      </div>
    </article>
  );
}
