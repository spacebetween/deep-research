'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const quickStarts = [
  {
    title: 'Mechanical Engineers',
    prompt: 'Find Mechanical Engineers in Essex, UK with CNC repair experience.',
  },
  {
    title: 'Dog Astronaut',
    prompt: 'A soviet dog with aspirations of going to space, does not mind a one way trip.',
  },
  {
    title: 'Replacement CTO',
    prompt: 'Find me a better version of this guy: www.linkedin.com/in/mcooke88/',
  },
] as const;

const taglines = [
  'Find people on LinkedIn, without donating your margin to the usual corporate toll booth.',
  'Because "just search LinkedIn harder" is not a sourcing strategy.',
  'For when your perfect candidate is definitely hiding behind "Open to work" and three stale job titles.',
  'LinkedIn search, minus the part where you sell a kidney for another seat.',
  'Turning vague hiring manager vibes into names, links, and fewer existential recruiter sighs.',
  'For permanent recruiters who know the best candidates are never in the first 200 results.',
  'Sourcing candidates so you can spend less time wrestling Boolean strings like it is 2009.',
  'Find the people LinkedIn swears do not exist until your competitor hires them.',
  'Built for the moment after someone says, "Can we just see a few more profiles?"',
  'Candidate sourcing with receipts, not just another spreadsheet of LinkedIn maybes.',
  'Because the phrase "quick LinkedIn search" has ruined enough afternoons.',
  'For recruiters who have already tried adding more brackets to the Boolean spell.',
] as const;

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = prompt.trim().length > 0;

  useEffect(() => {
    setTaglineIndex(Math.floor(Math.random() * taglines.length));
  }, []);

  function submitSearch(nextPrompt = prompt) {
    const trimmed = nextPrompt.trim();
    if (!trimmed) return;

    const params = new URLSearchParams({
      prompt: trimmed,
      autorun: '1',
    });

    router.push(`/agent?${params.toString()}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch();
  }

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }

  function handlePromptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(event.target.value);
    requestAnimationFrame(resizeTextarea);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return;
    if (event.nativeEvent.isComposing || isComposing) return;

    event.preventDefault();
    submitSearch();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--bg-base)] text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-[0.14]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_srgb,var(--accent-primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_50%_100%,color-mix(in_srgb,var(--accent-secondary)_10%,transparent),transparent_30%)]" aria-hidden />

      <section className="relative z-10 mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-4xl flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-6">
        <div className="mb-8 grid h-28 w-28 place-items-center sm:h-32 sm:w-32">
          <Image src="/unicornlogo.png" alt="Bad Unicorn" width={128} height={128} className="h-28 w-28 object-contain drop-shadow-[0_26px_50px_var(--shadow-accent)] unicorn-aura-drift sm:h-32 sm:w-32" priority />
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-[color:var(--text-primary)] sm:text-6xl">
          Bad Unicorn
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] transition-opacity sm:text-lg">
          {taglines[taglineIndex]}
        </p>

        <form className="mt-10 w-full" onSubmit={handleSubmit}>
          <label htmlFor="home-search" className="sr-only">
            Describe the candidate search
          </label>
          <div className="group relative mx-auto flex max-w-3xl items-end rounded-2xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-3 py-3 text-left shadow-[0_34px_90px_-60px_var(--shadow-accent)] transition focus-within:border-[color:var(--border-strong)] focus-within:ring-2 focus-within:ring-[color:var(--focus-ring)]/30 sm:px-4">
            <span className="ml-1 hidden h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--accent-secondary)] sm:block" aria-hidden />
            <textarea
              ref={textareaRef}
              id="home-search"
              value={prompt}
              autoFocus
              rows={1}
              placeholder="Find me Administrator's in Ashford Kent, with 5 years..."
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              className="max-h-[220px] min-h-10 min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-2 py-2 text-base leading-6 text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] sm:px-4 sm:text-lg sm:leading-7"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="shrink-0 rounded-xl bg-[color:var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-45 sm:px-6"
            >
              Run
            </button>
          </div>
        </form>

        <div className="mt-8 w-full max-w-3xl text-left">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">Quick starts</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickStarts.map(item => (
              <button
                key={item.title}
                type="button"
                onClick={() => submitSearch(item.prompt)}
                className="min-h-28 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] p-4 text-left transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--accent-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
              >
                <span className="block text-sm font-semibold text-[color:var(--text-primary)]">{item.title}</span>
                <span className="mt-2 block text-sm leading-5 text-[color:var(--text-secondary)]">{item.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 flex min-h-18 flex-col items-center justify-center gap-3 border-t border-[color:var(--border-soft)] px-4 py-4 text-sm text-[color:var(--text-secondary)] sm:flex-row sm:justify-between sm:px-7">
        <Link href="/" className="font-semibold tracking-wide text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]">
          Bad Unicorn
        </Link>
        <nav className="flex items-center gap-5 font-medium" aria-label="Footer">
          <Link href="/agent" className="transition hover:text-[color:var(--link-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]">
            Explore
          </Link>
          <Link href="/observability" className="transition hover:text-[color:var(--link-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]">
            Observability
          </Link>
        </nav>
      </footer>
    </main>
  );
}
