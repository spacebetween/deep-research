'use client';

import { signIn } from 'next-auth/react';

type SignInButtonProps = {
  callbackUrl: string;
};

export function SignInButton({ callbackUrl }: SignInButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void signIn('azure-ad', { callbackUrl })}
      className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[image:var(--gradient-unicorn)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_var(--shadow-accent)] transition hover:brightness-110"
    >
      Sign in with Microsoft
    </button>
  );
}
