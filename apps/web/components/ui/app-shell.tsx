import { type ReactNode } from 'react';
import Image from 'next/image';
import { cn } from './cn';
import { ThemeToggle } from './theme-toggle';

type AppShellProps = {
  subtitle: string;
  children: ReactNode;
  className?: string;
};

export function AppShell({ subtitle, children, className }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg-base)] text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-45" aria-hidden />
      <main
        className={cn(
          'relative z-10 mx-auto flex min-h-screen w-full max-w-[1720px] flex-col px-3 pb-6 pt-3 sm:px-5 sm:pb-8 lg:px-6',
          className,
        )}
      >
        <header className="mb-3 sm:mb-4">
          <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-veil)] px-3 py-2.5 shadow-[0_10px_32px_-28px_var(--shadow-color)] sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <Image
                  src="/unicornlogo.png"
                  alt="Bad Unicorn logo"
                  width={234}
                  height={234}
                  className="h-11 w-11 object-contain sm:h-12 sm:w-12"
                  priority
                />
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold tracking-[0.04em] text-[color:var(--text-primary)] sm:text-xl">
                    Bad Unicorn
                  </div>
                  <p className="truncate text-xs text-[color:var(--text-secondary)]">{subtitle}</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
