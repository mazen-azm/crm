import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

import { en } from './en';
import { ar } from './ar';
import type { Messages } from './en';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

const dictionaries: Record<Language, Messages> = { en, ar };
const directions: Record<Language, Direction> = { en: 'ltr', ar: 'rtl' };

type Translation = { language: Language; t: Messages; dir: Direction };

const I18nContext = createContext<Translation | null>(null);

export function I18nProvider({
  language = 'en',
  children,
}: {
  language?: Language;
  children: ReactNode;
}) {
  const value = useMemo<Translation>(
    () => ({ language, t: dictionaries[language], dir: directions[language] }),
    [language],
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
