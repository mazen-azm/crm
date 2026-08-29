import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';

import { AUTH_TOKEN_KEY, AuthProvider } from '../app/auth-context';
import { ThemeProvider } from '../app/theme-context';
import { I18nProvider } from '../shared/i18n';
import type { Language } from '../shared/i18n';

// One helper, so a test says what it is testing instead of restating the
// providers every screen already lives inside. The nesting mirrors
// app/App.tsx exactly — router, then language, then theme, then session —
// with a MemoryRouter so nothing touches window.history.
//
// "Mirrors App.tsx exactly" is load-bearing: when the shell started calling
// useTheme, every test that renders a screen began throwing, because the
// harness was one provider behind the application. Adding a provider to
// App.tsx means adding it here.
type Options = Omit<RenderOptions, 'wrapper'> & {
  route?: string;
  initialEntries?: string[];
  language?: Language;
  signedIn?: boolean | string;
};

export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  // No default for `language`. App.tsx passes none, so the harness passing
  // 'en' would not be mirroring it — and because an explicit prop beats
  // storage, a defaulted one means no test could ever exercise the stored
  // choice. Undefined here is the honest translation of "the caller did not
  // say".
  const { route, initialEntries, language, signedIn, ...rest } = options;

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
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
