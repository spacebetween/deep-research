import { type ReactNode } from 'react';
import Image from 'next/image';
import { cn } from './cn';

type AppShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
};

export function AppShell({ title, subtitle, children, className }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg-base)] text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-35" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_10%,rgba(176,38,255,0.2),transparent_44%),radial-gradient(circle_at_84%_88%,rgba(29,233,182,0.12),transparent_46%)]" aria-hidden />
      <div
        className="unicorn-aura-drift pointer-events-none absolute -left-28 top-[-220px] h-[640px] w-[640px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 46%, transparent) 0%, transparent 68%)',
        }}
        aria-hidden
      />
      <div
        className="unicorn-aura-drift pointer-events-none absolute -right-36 bottom-[-260px] h-[620px] w-[620px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-secondary) 44%, transparent) 0%, transparent 68%)',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,2,10,0.62)_100%)]" aria-hidden />

      <main
        className={cn(
          'relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-10 pt-4 sm:px-6 sm:pb-12 lg:px-10',
          className,
        )}
      >
        <header className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <Image
              src="/unicornlogo.png"
              alt="Bad Unicorn logo"
              width={234}
              height={234}
              className="h-[198px] w-[198px] object-contain sm:h-[234px] sm:w-[234px]"
              priority
            />
            <p className="text-2xl font-semibold tracking-[0.08em] text-[color:var(--text-primary)] uppercase sm:text-3xl">
              Bad Unicorn
            </p>
          </div>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
            Unicorns, but sourced with evil.
          </p>
        </header>

        {children}
      </main>
    </div>
  );
}
