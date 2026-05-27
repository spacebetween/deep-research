import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../lib/auth';
import { SignInButton } from './sign-in-button';

const errorMessages: Record<string, string> = {
  AccessDenied: 'Your Microsoft account signed in, but it was not accepted for the configured HRGO tenant.',
  Callback: 'Microsoft returned to the app, but the sign-in callback could not be completed.',
  Configuration: 'The sign-in provider is not configured correctly. Check the server environment variables.',
  OAuthCallback: 'Microsoft sign-in returned an OAuth callback error.',
  OAuthSignin: 'The app could not start Microsoft sign-in.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl || '/agent';

  if (session) {
    redirect(callbackUrl);
  }

  const errorCode = params?.error;
  const errorMessage = errorCode
    ? errorMessages[errorCode] ?? `Sign-in failed with error code: ${errorCode}.`
    : null;

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

        {errorMessage ? (
          <p className="mb-4 rounded-lg border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--status-danger-text)]">
            {errorMessage}
          </p>
        ) : null}

        <SignInButton callbackUrl={callbackUrl} />
      </section>
    </main>
  );
}
