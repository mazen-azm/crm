// The first request a screen makes on a fresh load must carry the token.
//
// It did not. setAuthTokenGetter was registered in the provider's useEffect,
// and React runs effects child-first — so a page's data effect fired before
// the provider had registered anything, readToken() returned the module
// default of null, and every request on a reload went out unauthenticated.
// The 401 that came back was read as an expired session, which cleared the
// token and bounced the reader to sign-in. Reloading any screen signed you out.
//
// No existing test saw it: page stubs answer 200 whatever headers arrive, so
// a missing Authorization header is invisible to them. This one asserts the
// header itself.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, waitFor } from '../testing/render';
import { TicketQueuePage } from '../pages/tickets/TicketQueuePage';
import { CustomersPage } from '../pages/customers/CustomersPage';

const json = (body: unknown) => () =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const empty = json({ items: [], total: 0, limit: 25, offset: 0 });

afterEach(() => vi.unstubAllGlobals());

const authOf = (init?: RequestInit) => new Headers(init?.headers).get('Authorization');

test('the queue sends the token on its very first request', async () => {
  const calls: Array<string | null> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(authOf(init));
      return Promise.resolve(empty());
    }),
  );

  renderWithProviders(<TicketQueuePage />, { signedIn: 'seeded-token' });

  await waitFor(() => expect(calls.length).toBeGreaterThan(0));
  // Not "some request eventually carries it" — the FIRST one must, because the
  // first one is what comes back 401 and ends the session.
  expect(calls[0]).toBe('Bearer seeded-token');
  expect(calls.every((c) => c === 'Bearer seeded-token')).toBe(true);
});

test('the customers screen does the same', async () => {
  const calls: Array<string | null> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(authOf(init));
      return Promise.resolve(empty());
    }),
  );

  renderWithProviders(<CustomersPage />, { signedIn: 'seeded-token' });

  await waitFor(() => expect(calls.length).toBeGreaterThan(0));
  expect(calls[0]).toBe('Bearer seeded-token');
});
