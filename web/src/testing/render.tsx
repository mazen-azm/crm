import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';

import { AUTH_TOKEN_KEY, AuthProvider } from '../app/auth-context';
import { I18nProvider } from '../shared/i18n';
import type { Language } from '../shared/i18n';

// One helper, so a test says what it is testing instead of restating the
// providers every screen already lives inside. The nesting mirrors
// app/App.tsx exactly — router, then language, then session — with a
// MemoryRouter so nothing touches window.history.
type Options = Omit<RenderOptions, 'wrapper'> & {
  route?: string;
  initialEntries?: string[];
  language?: Language;
  signedIn?: boolean | string;
};

export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  const { route, initialEntries, language = 'en', signedIn, ...rest } = options;

  // Seeded before the render, not after: AuthProvider reads storage on its
  // first render, so a token written afterwards would arrive too late to make
  // the visitor signed in.
  if (signedIn) {
    localStorage.setItem(AUTH_TOKEN_KEY, typeof signedIn === 'string' ? signedIn : 'stub-token');
  }

  const entries = initialEntries ?? (route ? [route] : ['/']);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={entries}>
        <I18nProvider language={language}>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
