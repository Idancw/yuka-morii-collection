import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentKey = 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'green';

export const ACCENTS: Record<AccentKey, { label: string; h: number; s: number; l: number }> = {
  blue: { label: 'Blue', h: 211, s: 92, l: 58 },
  purple: { label: 'Purple', h: 262, s: 75, l: 60 },
  pink: { label: 'Pink', h: 330, s: 75, l: 60 },
  red: { label: 'Red', h: 0, s: 72, l: 55 },
  orange: { label: 'Orange', h: 25, s: 90, l: 55 },
  yellow: { label: 'Yellow', h: 45, s: 90, l: 52 },
  green: { label: 'Green', h: 142, s: 65, l: 40 },
};

const MODE_KEY = 'yuka-theme-mode';
const ACCENT_KEY = 'yuka-theme-accent';

function readMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(MODE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readAccent(): AccentKey {
  if (typeof window === 'undefined') return 'blue';
  const stored = localStorage.getItem(ACCENT_KEY) as AccentKey | null;
  return stored && ACCENTS[stored] ? stored : 'blue';
}

export function useThemePreferences() {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  const [accent, setAccent] = useState<AccentKey>(readAccent);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    const { h, s, l } = ACCENTS[accent];
    const effectiveL = mode === 'dark' ? Math.min(l + 8, 72) : l;
    const root = document.documentElement.style;
    root.setProperty('--primary', `${h} ${s}% ${effectiveL}%`);
    root.setProperty('--ring', `${h} ${s}% ${effectiveL}%`);
    root.setProperty(
      '--gradient-primary',
      `linear-gradient(135deg, hsl(${h} ${s}% ${effectiveL}%), hsl(${(h + 20) % 360} ${s}% ${effectiveL}%))`
    );
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent, mode]);

  return { mode, setMode, accent, setAccent };
}
