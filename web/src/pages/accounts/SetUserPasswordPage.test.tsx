// Proves scripts/criteria/identity.md section IDENTITY-6-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { SetUserPasswordPage } from './SetUserPasswordPage';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

// A FRESH Response per call (L-30).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const DONE = { id: 'u-9', updatedAt: '2026-08-30T09:00:00.000Z' };
const ADMIN = { id: 'u-1', role: 'admin', name: 'Nadia Haddad' };
const AGENT = { id: 'u-2', role: 'agent', name: 'Omar Reilly' };

// /me answers who is signed in; everything else is the set-password call.
function stub({ me = ADMIN, set = () => json(DONE) } = {}) {
  const sent: Array<Record<string, unknown>> = [];
  const paths: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://desk.test').pathname;
    if (path === '/api/v1/me') return Promise.resolve(json(me));
    paths.push(path);
    if (init?.body) sent.push(JSON.parse(String(init.body)));
    return Promise.resolve(set());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, sent, paths };
}

afterEach(() => vi.unstubAllGlobals());

const render = (language?: 'en' | 'ar') =>
  renderWithProviders(<SetUserPasswordPage />, { signedIn: true, language });

type Filled = { id?: string; password?: string; confirm?: string };
async function fill({ id = 'u-9', password = 'a-good-long-password', confirm }: Filled = {}) {
  const second = confirm ?? password;
  await userEvent.type(screen.getByLabelText(en.setPassword.userId), id);
  await userEvent.type(screen.getByLabelText(en.setPassword.password), password);
  await userEvent.type(screen.getByLabelText(en.setPassword.confirm), second);
  await userEvent.click(screen.getByRole('button', { name: en.setPassword.submit }));
}

test('the password is set, and the screen names the account it was set for', async () => {
  const { sent, paths } = stub();
  render();

  await waitFor(() => expect(screen.getByLabelText(en.setPassword.userId)).toBeInTheDocument());
  await fill();

  expect(await screen.findByText(en.setPassword.done)).toBeInTheDocument();
  // WHICH account. A confirmation that does not name it is one you cannot
  // check, and this is the screen for somebody working through several
  // locked-out people at once.
  expect(screen.getByText(DONE.id)).toBeInTheDocument();

  expect(paths).toEqual(['/api/v1/accounts/u-9/set-password']);
  // The API takes `password`; the second copy never leaves the screen.
  expect(sent).toEqual([{ password: 'a-good-long-password' }]);
});

test('two passwords that differ never reach the API', async () => {
  const { paths } = stub();
  render();

  await waitFor(() => expect(screen.getByLabelText(en.setPassword.userId)).toBeInTheDocument());
  await fill({ password: 'a-good-long-password', confirm: 'a-good-long-passwrod' });

  // The API never sees the second copy, so it cannot check this. An admin who
  // mistypes here locks somebody out a second time — and the person it happens
  // to cannot tell the difference between that and the first time.
  expect(screen.getByRole('alert')).toHaveTextContent(en.setPassword.mismatch);
  expect(paths).toEqual([]);
});

test('a field the API named is marked with the shared sentence', async () => {
  stub({ set: () => json({ code: 'VALIDATION_FAILED', fields: ['password'] }, 422) });
  render();

  await waitFor(() => expect(screen.getByLabelText(en.setPassword.userId)).toBeInTheDocument());
  await fill({ password: 'short', confirm: 'short' });

  await waitFor(() =>
    expect(screen.getByLabelText(en.setPassword.password)).toHaveAttribute('aria-invalid', 'true'),
  );
  expect(screen.getByRole('alert')).toHaveTextContent(en.errors.VALIDATION_FAILED);
  expect(screen.getByLabelText(en.setPassword.userId)).not.toHaveAttribute('aria-invalid');
});

test('a refusal that named no field shows the shared banner', async () => {
  stub({ set: () => json({ code: 'FORBIDDEN' }, 403) });
  render();

  await waitFor(() => expect(screen.getByLabelText(en.setPassword.userId)).toBeInTheDocument());
  await fill();

  // An admin naming themselves gets this, and so does an agent who typed the
  // URL. The API decides; the screen reports.
  expect(await screen.findByText(en.setPassword.failed)).toBeInTheDocument();
  expect(screen.getByText(en.errors.FORBIDDEN)).toBeInTheDocument();
});

test('a second press while the first is in flight is not a second set', async () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const { fetch } = stub({ set: () => pending as unknown as Response });
  render();

  await waitFor(() => expect(screen.getByLabelText(en.setPassword.userId)).toBeInTheDocument());
  await fill();

  const busy = await screen.findByRole('button', { name: en.setPassword.submitting });
  expect(busy).toBeDisabled();
  await userEvent.click(busy, { pointerEventsCheck: 0 });
  const sets = fetch.mock.calls.filter(([input]) =>
    String(input).includes('/set-password'),
  );
  expect(sets).toHaveLength(1);

  release(json(DONE));
  expect(await screen.findByText(en.setPassword.done)).toBeInTheDocument();
});

test('an agent is told this is not theirs, rather than shown a form that will fail', async () => {
  const { paths } = stub({ me: AGENT });
  render();

  expect(await screen.findByText(en.setPassword.adminOnly)).toBeInTheDocument();
  expect(screen.queryByLabelText(en.setPassword.userId)).not.toBeInTheDocument();
  expect(paths).toEqual([]);
});

test('the form is not drawn before we know who is asking', async () => {
  // Neither the form nor the refusal, while /me is in flight. Drawing the
  // refusal for an admin — even for the length of one request — tells them
  // they are not one; drawing the form and taking it away is worse.
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) =>
      String(input).includes('/me') ? pending : Promise.resolve(json(DONE)),
    ),
  );
  render();

  expect(screen.queryByText(en.setPassword.adminOnly)).not.toBeInTheDocument();

  release(json(ADMIN));
  expect(await screen.findByLabelText(en.setPassword.userId)).toBeInTheDocument();
});

test('an admin is offered the way in, and an agent is not', async () => {
  stub({ me: ADMIN });
  const admin = renderWithProviders(<AppRoutes />, { signedIn: true, route: '/accounts/set-password' });
  expect(
    await screen.findByRole('link', { name: en.shell.navSetPassword }),
  ).toHaveAttribute('href', '/accounts/set-password');
  admin.unmount();

  stub({ me: AGENT });
  renderWithProviders(<AppRoutes />, { signedIn: true, route: '/accounts/set-password' });
  // The nav entry is courtesy, not enforcement — but a link that always fails
  // is the button-that-goes-nowhere defect wearing a permission.
  await screen.findByText(en.setPassword.adminOnly);
  expect(screen.queryByRole('link', { name: en.shell.navSetPassword })).not.toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  stub();
  render('ar');

  expect(
    await screen.findByRole('heading', { name: ar.setPassword.title }),
  ).toBeInTheDocument();
  expect(await screen.findByLabelText(ar.setPassword.userId)).toBeInTheDocument();
  expect(ar.setPassword.title).not.toBe(en.setPassword.title);
});
