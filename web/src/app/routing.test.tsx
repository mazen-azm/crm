// Proves criteria 1 and 2 of scripts/criteria/platform.md section
// PLATFORM-9-WEB: an unauthenticated visitor lands on sign-in, and a stored
// session survives a reload.
import { describe, expect, test, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';
import { AUTH_TOKEN_KEY } from './auth-context';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('the router', () => {
  test('sends an unauthenticated visitor to sign-in', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  test('a stored session survives a reload — the app boots signed in', async () => {
    // A reload is a fresh mount reading storage, which is exactly this.
    localStorage.setItem(AUTH_TOKEN_KEY, 'stub-token');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
  });

  test('signing in reaches the desk, and signing out returns to sign-in', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('stub-token');

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  test('an unknown path lands on the guarded root, not a blank screen', async () => {
    window.history.pushState({}, '', '/nothing-here');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
