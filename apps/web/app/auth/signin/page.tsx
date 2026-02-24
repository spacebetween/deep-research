'use client';

import Image from 'next/image';

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[color:var(--bg-base)] text-[color:var(--text-primary)]">
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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 px-4">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/unicornlogo.png"
            alt="Bad Unicorn logo"
            width={234}
            height={234}
            className="h-20 w-20 object-contain"
            priority
          />
          <h1 className="text-3xl font-bold tracking-[0.04em]">Bad Unicorn</h1>
          <p className="text-center text-sm text-[color:var(--text-secondary)]">
            Sign in with your Microsoft 365 account to access the recruiter intelligence workspace.
          </p>
        </div>

        <form action="/api/auth/signin/microsoft-entra-id" method="POST">
          <button
            type="submit"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-8 py-3.5 text-sm font-semibold tracking-wide text-[color:var(--text-primary)] transition-all hover:border-[color:var(--border-strong)] hover:shadow-[0_0_32px_-8px_var(--shadow-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 21 21"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}
