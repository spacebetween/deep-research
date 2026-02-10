'use client';

import { useEffect, useState } from 'react';
import { cn } from './cn';

const THEME_STORAGE_KEY = 'bad-unicorn-theme';

type Theme = 'light' | 'dark';

const isTheme = (value: string | null | undefined): value is Theme => value === 'light' || value === 'dark';

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const rootTheme = document.documentElement.getAttribute('data-theme');
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = isTheme(rootTheme) ? rootTheme : isTheme(savedTheme) ? savedTheme : getSystemTheme();
    applyTheme(initialTheme);
    setTheme(initialTheme);
    setIsMounted(true);
  }, []);

  const handleToggle = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={theme === 'dark'}
      onClick={handleToggle}
      disabled={!isMounted}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-3 text-xs font-semibold tracking-[0.07em] text-[color:var(--text-secondary)] uppercase transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)] disabled:cursor-wait disabled:opacity-70',
        className,
      )}
    >
      <span
        className="relative inline-flex h-4 w-8 items-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--pill-neutral-bg)]"
        aria-hidden
      >
        <span
          className={cn(
            'h-3 w-3 rounded-full bg-[color:var(--accent-primary)] transition-transform',
            theme === 'dark' ? 'translate-x-[2px]' : 'translate-x-[17px]',
          )}
        />
      </span>
      <span>{isMounted ? (theme === 'dark' ? 'Dark' : 'Light') : 'Theme'}</span>
    </button>
  );
}
