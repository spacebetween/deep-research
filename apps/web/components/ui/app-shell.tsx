'use client';

import { type ReactNode } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { cn } from './cn';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

type AppShellProps = {
  subtitle: string;
  children: ReactNode;
  className?: string;
};

export function AppShell({ subtitle, children, className }: AppShellProps) {
  const { data: session } = useSession();

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
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--scene-vignette)]" aria-hidden />

      <main
        className={cn(
          'relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-8 pt-3 sm:px-6 sm:pb-10 lg:px-10',
          className,
        )}
      >
        <header className="mb-5 sm:mb-6">
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-veil)] px-3 py-3 shadow-[0_20px_54px_-40px_var(--shadow-color)] backdrop-blur-xl sm:px-4 sm:py-3.5">
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
                  <h1 className="truncate text-xl font-bold tracking-[0.04em] text-[color:var(--text-primary)] sm:text-2xl">
                    Bad Unicorn
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {session?.user && (
                  <UserMenu
                    name={session.user.name}
                    email={session.user.email}
                    image={session.user.image}
                  />
                )}
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)] sm:text-sm">{subtitle}</p>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
