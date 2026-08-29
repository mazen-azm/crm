// Proves scripts/criteria/identity.md section IDENTITY-3-WEB: a token the API
// no longer accepts puts the reader on sign-in, told why — and a wrong
// password on sign-in does none of that.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../testing/render';
import { AppRoutes } from './routes';
import { AUTH_TOKEN_KEY } from './auth-context';
import { en } from '../shared/i18n/en';

// A fetch that answers 401 the way the API does, for any request — and a FRESH
// Response every call. A Response body can be read once, so a mock resolving
// one instance hands a consumed body to the second caller. These tests passed
// with it anyway, by luck: the client's failure path catches the json() error
// and falls back to an empty body, and the handler keys off the status, which
// survives. The moment one of them asserts on `code`, that luck runs out.
function refusingFetch(status = 401, code = 'UNAUTHENTICATED') {
  return vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ code, requestId: 'r-1' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

test('a token the API rejects clears the session and lands on sign-in', async () => {
  vi.stubGlobal('fetch', refusingFetch());
  renderWithProviders(<AppRoutes />, { signedIn: 'stale-token' });

  // The desk renders first, then a request goes out with the dead token.
  await screen.findByRole('heading', { name: en.home.heading });
  const { request } = await import('../shared/api/client');
  await expect(request('/me')).rejects.toBeTruthy();

  expect(await screen.findByRole('heading', { name: en.signIn.heading })).toBeInTheDocument();
  expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
});

test('and the reader is told the session ended, not dropped there silently', async () => {
  vi.stubGlobal('fetch', refusingFetch());
  renderWithProviders(<AppRoutes />, { signedIn: 'stale-token' });
  await screen.findByRole('heading', { name: en.home.heading });

  const { request } = await import('../shared/api/client');
  await expect(request('/me')).rejects.toBeTruthy();

  await screen.findByRole('heading', { name: en.signIn.heading });
  const banner = await screen.findByRole('status');
  expect(banner).toHaveTextContent(en.errors.UNAUTHENTICATED);
});

test('three requests losing at once send the reader to sign-in once', async () => {
  vi.stubGlobal('fetch', refusingFetch());
  renderWithProviders(<AppRoutes />, { signedIn: 'stale-token' });
  await screen.findByRole('heading', { name: en.home.heading });

  const { request } = await import('../shared/api/client');
  await Promise.allSettled([request('/me'), request('/me'), request('/me')]);

  await screen.findByRole('heading', { name: en.signIn.heading });
  // One banner, not three, and one heading — the guard on the already-cleared
  // token is what makes the second and third arrivals no-ops.
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getAllByRole('heading', { name: en.signIn.heading })).toHaveLength(1);
});

test('a wrong password is not an expired session', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', refusingFetch());
  renderWithProviders(<AppRoutes />, { route: '/sign-in' });

  await screen.findByRole('heading', { name: en.signIn.heading });
  await user.type(screen.getByLabelText(en.signIn.emailLabel), 'someone@support-desk.local');
  await user.type(screen.getByLabelText(en.signIn.passwordLabel), 'wrong');
  await user.click(screen.getByRole('button', { name: en.signIn.submit }));

  // The screen's own sentence, which stands in for three different truths on
  // purpose (L-29) — and no session-ended banner, because nothing ended.
  expect(await screen.findByText(en.signIn.errorUnauthenticated)).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('a signed-in visitor typing a wrong password on sign-in keeps their session', async () => {
  // This is the test that makes the opt-out load-bearing. The earlier
  // wrong-password test does not: nobody is signed in there, so the handler's
  // "already cleared" guard returns early and the exemption never shows.
  //
  // /sign-in is not guarded against somebody who is already signed in, so this
  // is reachable: without suppressSessionExpiry, one wrong password would sign
  // out the session they still had.
  const user = userEvent.setup();
  vi.stubGlobal('fetch', refusingFetch());
  renderWithProviders(<AppRoutes />, { route: '/sign-in', signedIn: 'good-token' });

  await screen.findByRole('heading', { name: en.signIn.heading });
  await user.type(screen.getByLabelText(en.signIn.emailLabel), 'someone@support-desk.local');
  await user.type(screen.getByLabelText(en.signIn.passwordLabel), 'wrong');
  await user.click(screen.getByRole('button', { name: en.signIn.submit }));

  expect(await screen.findByText(en.signIn.errorUnauthenticated)).toBeInTheDocument();
  expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('good-token');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('signing out by choice says nothing about expiry', async () => {
  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />, { signedIn: true });

  await screen.findByRole('heading', { name: en.home.heading });
  await user.click(screen.getByRole('button', { name: en.home.signOut }));

  await screen.findByRole('heading', { name: en.signIn.heading });
  // You chose to leave. Being told your session expired would be a lie about
  // what just happened.
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('the handler is unregistered when the provider goes away', async () => {
  vi.stubGlobal('fetch', refusingFetch());
  const first = renderWithProviders(<AppRoutes />, { signedIn: 'stale-token' });
  await screen.findByRole('heading', { name: en.home.heading });
  first.unmount();

  // Nothing is mounted to hear this. Without the effect cleanup it would call
  // setSessionEnded on a component nobody renders — and in this suite, a
  // handler from one test would fire during the next.
  const { request } = await import('../shared/api/client');
  await expect(request('/me')).rejects.toBeTruthy();
});
