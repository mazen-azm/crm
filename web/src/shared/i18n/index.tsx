import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { en } from './en';
import { ar } from './ar';
import type { Messages } from './en';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

const dictionaries: Record<Language, Messages> = { en, ar };
const directions: Record<Language, Direction> = { en: 'ltr', ar: 'rtl' };

export const LANGUAGE_KEY = 'support-desk.language';

const LANGUAGES: readonly Language[] = ['en', 'ar'];
const isLanguage = (value: string | null): value is Language =>
  value !== null && (LANGUAGES as readonly string[]).includes(value);

function readStoredLanguage(fallback: Language): Language {
  // Storage can throw: a private window, a browser with site data blocked, or
  // a runtime whose localStorage global is a stub. A visitor who cannot store
  // a preference gets the fallback, never a blank screen. Same shape as
  // app/theme-context.tsx, because it is the same problem.
  try {
    const raw = globalThis.localStorage?.getItem(LANGUAGE_KEY) ?? null;
    // A value nobody recognises would put lang="fr" on the document and load
    // no dictionary at all.
    return isLanguage(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

type Translation = {
  language: Language;
  t: Messages;
  dir: Direction;
  setLanguage: (next: Language) => void;
  toggleLanguage: () => void;
};

const I18nContext = createContext<Translation | null>(null);

export function I18nProvider({
  language,
  children,
}: {
  language?: Language;
  children: ReactNode;
}) {
  // An explicit prop is a caller stating intent, so it beats storage. Only when
  // none is given — which is every case in the application, since App.tsx
  // passes none — does the stored choice decide. Read synchronously here, not
  // in an effect: a returning Arabic visitor must not see an English flash.
  const [current, setCurrent] = useState<Language>(() => language ?? readStoredLanguage('en'));

  const setLanguage = useCallback((next: Language) => {
    try {
      globalThis.localStorage?.setItem(LANGUAGE_KEY, next);
    } catch {
      // Chosen for this tab only; the reload will not remember it.
    }
    setCurrent(next);
  }, []);

  const value = useMemo<Translation>(
    () => ({
      language: current,
      t: dictionaries[current],
      dir: directions[current],
      setLanguage,
      // Derived here rather than in its own useCallback: one closing over
      // `current` would toggle from a stale value after two quick clicks.
      toggleLanguage: () => setLanguage(current === 'en' ? 'ar' : 'en'),
    }),
    [current, setLanguage],
  );

  useEffect(() => {
    // Direction and language live on <html>: the CSS logical properties every
    // primitive uses resolve from it, and a screen reader announces the right
    // language. Nothing mirrors a layout by hand.
    const root = document.documentElement;
    root.setAttribute('dir', value.dir);
    root.setAttribute('lang', value.language);
  }, [value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): Translation {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useTranslation() was called outside I18nProvider');
  return value;
}
