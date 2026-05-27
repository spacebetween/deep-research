import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../lib/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl || '/recruiters';

  if (session) {
    redirect(callbackUrl);
  }

  const signInHref = `/api/auth/signin/azure-ad?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[color:var(--bg-base)] px-4 text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-35" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--scene-vignette)]" aria-hidden />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-veil)] p-6 shadow-[0_28px_80px_-48px_var(--shadow-color)] backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/unicornlogo.png" alt="Bad Unicorn logo" width={56} height={56} className="h-14 w-14 object-contain" priority />
          <div>
            <h1 className="text-2xl font-bold">Bad Unicorn</h1>
            <p className="text-sm text-[color:var(--text-secondary)]">Sign in with your HRGO Microsoft account.</p>
          </div>
        </div>

        {params?.error ? (
          <p className="mb-4 rounded-lg border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--status-danger-text)]">
            Sign-in failed. Use an account from the configured HRGO tenant.
          </p>
        ) : null}

        <Link
          href={signInHref}
          className="flex min-h-12 items-center justify-center rounded-lg bg-[image:var(--gradient-unicorn)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_var(--shadow-accent)] transition hover:brightness-110"
        >
          Sign in with Microsoft
        </Link>
      </section>
    </main>
  );
}
