// Proves the harness itself: it runs without network, it does not swallow a
// broken component, and it puts the providers in place so a test does not.
// scripts/criteria/platform.md section PLATFORM-11-WEB.
import { expect, test, vi } from 'vitest';

import { renderWithProviders, screen } from './render';
import { HomePage } from '../pages/home/HomePage';

function Boom(): never {
  throw new Error('deliberate');
}

test('the helper surfaces an error a component throws instead of swallowing it', () => {
  // React logs the error itself; the test is about the throw reaching us.
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(() => renderWithProviders(<Boom />)).toThrow(/deliberate/);
  } finally {
    quiet.mockRestore();
  }
});

test('an unstubbed fetch fails the test and names the call', () => {
  expect(() => fetch('/api/v1/health')).toThrow(/unstubbed fetch call in test: GET \/api\/v1\/health/);
});

test('a stubbed fetch is honoured, and does not leak into the next test', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  await expect(fetch('/api/v1/health')).resolves.toBeInstanceOf(Response);
});

test('the previous test did not leak its stub', () => {
  expect(() => fetch('/api/v1/health')).toThrow(/unstubbed fetch/);
});

test('storage starts empty in every test', () => {
  expect(localStorage.length).toBe(0);
  localStorage.setItem('left-behind', 'x');
});

test('and the item the previous test left behind is gone', () => {
  expect(localStorage.getItem('left-behind')).toBeNull();
});

test('the helper puts the providers in place, so a page renders alone', async () => {
  // HomePage reads the auth context and the translations; neither is stated
  // here, which is the point of the fourth criterion.
  renderWithProviders(<HomePage />, { signedIn: true });
  expect(await screen.findByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
});
