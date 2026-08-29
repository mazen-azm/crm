// Proves criteria 1 and 2 of scripts/criteria/platform.md section
// PLATFORM-9-WEB: an unauthenticated visitor lands on sign-in, and a stored
// session survives a reload. The providers come from the render helper, so
// this file states only what it is actually testing.
import { describe, expect, test } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../testing/render';
import { AppRoutes } from './routes';
import { THEME_KEY } from './theme-context';
import { AUTH_TOKEN_KEY } from './auth-context';

describe('the router', () => {
  test('sends an unauthenticated visitor to sign-in', async () => {
    renderWithProviders(<AppRoutes />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  test('a stored session survives a reload — the app boots signed in', async () => {
    // A reload is a fresh mount reading storage, which is exactly this.
    renderWithProviders(<AppRoutes />, { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
  });

  test('signing out returns to sign-in and forgets the session', async () => {
    // Signing in now calls the API; that whole path is exercised in
    // pages/sign-in/SignInPage.test.tsx. What belongs here is the routing:
    // a session ends and the guard takes over again.
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { signedIn: true });

    expect(await screen.findByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  test('an unknown path lands on the guarded root, not a blank screen', async () => {
    renderWithProviders(<AppRoutes />, { route: '/nothing-here' });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  test('the helper can render a screen in another language', async () => {
    renderWithProviders(<AppRoutes />, { language: 'ar' });
    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });
});

test('the shell does not wrap sign-in — there is nothing there to navigate', async () => {
  renderWithProviders(<AppRoutes />, { route: '/' });

  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  // No navigation landmark, because an unauthenticated visitor is redirected
  // before the shell can mount.
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
});

test('the theme survives a reload, which is a fresh render reading the same storage', async () => {
  localStorage.setItem(THEME_KEY, 'dark');
  renderWithProviders(<AppRoutes />, { signedIn: true });

  await screen.findByRole('heading', { name: 'Support Desk' });
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});
