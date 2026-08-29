import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'support-desk.theme';

const THEMES: readonly Theme[] = ['light', 'dark'];
const isTheme = (value: string | null): value is Theme =>
  value !== null && (THEMES as readonly string[]).includes(value);

type ThemeValue = { theme: Theme; setTheme: (next: Theme) => void; toggleTheme: () => void };

const ThemeContext = createContext<ThemeValue | null>(null);

function readStoredTheme(): Theme {
  // Storage can throw: a private window, a browser with site data blocked, or
  // a runtime whose localStorage global is a stub. A visitor who cannot store
  // a preference gets the default, never a blank screen. Same shape as
  // auth-context.tsx.
  try {
    const raw = globalThis.localStorage?.getItem(THEME_KEY) ?? null;
    // An unrecognised stored value would put data-theme="sepia" on <html> and
    // silently match no palette at all, which reads as the theme being broken
    // rather than as the stored value being junk.
    return isTheme(raw) ? raw : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read synchronously on the first render — the same reason auth reads its
  // token synchronously. An effect would paint the light palette first and
  // correct it a frame later, which is a flash on every reload.
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const setTheme = useCallback((next: Theme) => {
    try {
      globalThis.localStorage?.setItem(THEME_KEY, next);
    } catch {
      // Chosen for this tab only; the reload will not remember it.
    }
    setThemeState(next);
  }, []);

  useEffect(() => {
    // The palette lives on <html data-theme="…">, so the tokens file's second
    // block resolves for every element without a wrapper class and without
    // any component knowing which theme is on.
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo<ThemeValue>(
    () => ({
      theme,
      setTheme,
      // Derived here rather than in its own useCallback: one closing over
      // `theme` would toggle from a stale value after two quick clicks.
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme() was called outside ThemeProvider');
  return value;
}
