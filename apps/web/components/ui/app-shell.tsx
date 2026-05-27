import { type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from './cn';
import { ThemeToggle } from './theme-toggle';

type AppShellProps = {
  subtitle: string;
  children: ReactNode;
  className?: string;
  observabilitySecret?: string;
};

const withSecret = (path: string, secret: string | undefined) => {
  if (!secret) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}secret=${encodeURIComponent(secret)}`;
};

export function AppShell({ subtitle, children, className, observabilitySecret }: AppShellProps) {
  const footerSections = [
    {
      label: 'Workspace',
      links: [
        {
          href: '/agent',
          label: 'Agent workspace',
          description: 'Run recruiter searches and review candidate evidence.',
        },
      ],
    },
    {
      label: 'Observability',
      links: [
        {
          href: withSecret('/observability', observabilitySecret),
          label: 'Telemetry dashboard',
          description: 'Request volume, failures, tool calls, and result signals.',
        },
        {
          href: withSecret('/observability/sessions', observabilitySecret),
          label: 'Sessions',
          description: 'Grouped conversations and request journeys.',
        },
        {
          href: '/api/health',
          label: 'Health check',
          description: 'Service readiness endpoint.',
        },
      ],
    },
  ];

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
              <ThemeToggle />
            </div>
            <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)] sm:text-sm">{subtitle}</p>
          </div>
        </header>

        {children}

        <footer className="mt-8 border-t border-[color:var(--border-soft)] pt-5 sm:mt-10 sm:pt-6">
          <nav className="grid gap-5 text-sm sm:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)]" aria-label="Application footer">
            <div>
              <div className="text-xs font-semibold tracking-[0.16em] text-[color:var(--text-tertiary)] uppercase">
                Bad Unicorn
              </div>
              <p className="mt-2 max-w-sm text-xs leading-5 text-[color:var(--text-secondary)]">
                Recruiter workspace navigation and operating telemetry.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {footerSections.map(section => (
                <section key={section.label} aria-labelledby={`footer-${section.label.toLowerCase()}`}>
                  <h2
                    id={`footer-${section.label.toLowerCase()}`}
                    className="text-xs font-semibold tracking-[0.16em] text-[color:var(--text-tertiary)] uppercase"
                  >
                    {section.label}
                  </h2>
                  <ul className="mt-2 grid gap-2">
                    {section.links.map(link => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="group block rounded-lg border border-transparent px-2 py-2 transition hover:border-[color:var(--border-soft)] hover:bg-[color:var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)]"
                        >
                          <span className="font-medium text-[color:var(--text-primary)] transition group-hover:text-[color:var(--link-primary-hover)]">
                            {link.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-[color:var(--text-secondary)]">
                            {link.description}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </nav>
        </footer>
      </main>
    </div>
  );
}
