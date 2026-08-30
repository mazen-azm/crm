// Proves scripts/criteria/identity.md section IDENTITY-7-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../../testing/render';
import { ChangeOwnPasswordPage } from './ChangeOwnPasswordPage';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

// A FRESH Response per call (L-30).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const OK = { id: 'u-1', updatedAt: '2026-08-30T09:00:00.000Z' };

function stub(answer: () => Response = () => json(OK)) {
  const sent: Array<Record<string, unknown>> = [];
  const paths: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    paths.push(new URL(String(input), 'http://desk.test').pathname);
    if (init?.body) sent.push(JSON.parse(String(init.body)));
    return Promise.resolve(answer());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, sent, paths };
}

afterEach(() => vi.unstubAllGlobals());

const render = (language?: 'en' | 'ar') =>
  renderWithProviders(<ChangeOwnPasswordPage />, { signedIn: true, language });

type Filled = { current?: string; next?: string; confirm?: string };

// `confirm` defaults to `next` in the body rather than in the destructuring:
// a default that names an earlier binding of the same pattern leaves tsc
// unable to infer either (TS7022), and vitest never typechecks — the build
// does, which is why `npm run build` is a separate step in every plan here.
async function fill({ current = 'my-current-password', next = 'my-brand-new-password', confirm }: Filled = {}) {
  const second = confirm ?? next;
  await userEvent.type(screen.getByLabelText(en.account.passwordCurrent), current);
  await userEvent.type(screen.getByLabelText(en.account.passwordNew), next);
  await userEvent.type(screen.getByLabelText(en.account.passwordConfirm), second);
  await userEvent.click(screen.getByRole('button', { name: en.account.passwordSubmit }));
}

test('the change goes to the route every role uses, with the two passwords', async () => {
  const { sent, paths } = stub();
  render();

  await fill();

  expect(await screen.findByText(en.account.passwordChanged)).toBeInTheDocument();
  // request() prefixes /api/v1 itself; the route is the one an admin, an agent
  // and a customer all use.
  expect(paths).toEqual(['/api/v1/me/password']);
  expect(sent).toEqual([
    { currentPassword: 'my-current-password', newPassword: 'my-brand-new-password' },
  ]);
});

test('changing it does not sign you out, and the screen says so', async () => {
  stub();
  render();

  await fill();

  // The opposite is what people expect, so it is stated rather than implied by
  // the absence of a redirect.
  expect(await screen.findByText(en.account.passwordStillSignedIn)).toBeInTheDocument();
  expect(screen.queryByLabelText(en.account.passwordCurrent)).not.toBeInTheDocument();
});

test('a wrong current password marks that field, in this screen’s own words', async () => {
  stub(() => json({ code: 'UNAUTHENTICATED' }, 401));
  render();

  await fill({ current: 'not-my-password' });

  const current = await screen.findByLabelText(en.account.passwordCurrent);
  expect(current).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent(en.account.passwordWrongCurrent);

  // NOT the shared 401 sentence. That one says the session has ended and to
  // sign in again — true of every other 401 in this product and false here,
  // where the session is fine and the password was wrong.
  expect(screen.queryByText(en.errors.UNAUTHENTICATED)).not.toBeInTheDocument();
  // And no banner: the mark beside the field carries it.
  expect(screen.queryByText(en.account.passwordFailed)).not.toBeInTheDocument();
});

test('a new password the API refuses is marked from its fields, as everywhere else', async () => {
  stub(() => json({ code: 'VALIDATION_FAILED', fields: ['newPassword'] }, 422));
  render();

  await fill({ next: 'short', confirm: 'short' });

  const next = await screen.findByLabelText(en.account.passwordNew);
  expect(next).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent(en.errors.VALIDATION_FAILED);
  expect(screen.getByLabelText(en.account.passwordCurrent)).not.toHaveAttribute('aria-invalid');
});

test('two new passwords that differ never reach the API', async () => {
  const { fetch } = stub();
  render();

  await fill({ next: 'my-brand-new-password', confirm: 'my-brand-new-passwrod' });

  // The API cannot catch this — it never sees the second copy. Without the
  // check, a mistyped new password is accepted and the person who typed it is
  // locked out of an account they were in a moment ago: the one mistake on
  // this screen nobody can undo themselves.
  expect(screen.getByRole('alert')).toHaveTextContent(en.account.passwordMismatch);
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByLabelText(en.account.passwordConfirm)).toHaveAttribute('aria-invalid', 'true');
});

test('correcting the mismatch clears the mark rather than leaving it standing', async () => {
  const { fetch } = stub();
  render();

  await fill({ next: 'my-brand-new-password', confirm: 'wrong' });
  expect(screen.getByRole('alert')).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(en.account.passwordConfirm), 'x');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  await userEvent.clear(screen.getByLabelText(en.account.passwordConfirm));
  await userEvent.type(screen.getByLabelText(en.account.passwordConfirm), 'my-brand-new-password');
  await userEvent.click(screen.getByRole('button', { name: en.account.passwordSubmit }));
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('a second press while the first is in flight is not a second change', async () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const fetch = vi.fn(() => pending);
  vi.stubGlobal('fetch', fetch);
  render();

  await fill();
  const busy = await screen.findByRole('button', { name: en.account.passwordSubmitting });
  expect(busy).toBeDisabled();
  await userEvent.click(busy, { pointerEventsCheck: 0 });
  expect(fetch).toHaveBeenCalledTimes(1);

  release(json(OK));
  expect(await screen.findByText(en.account.passwordChanged)).toBeInTheDocument();
});

test('a failure the API did not attribute to a field shows the shared banner', async () => {
  stub(() => json({ code: 'INTERNAL' }, 500));
  render();

  await fill();

  expect(await screen.findByText(en.account.passwordFailed)).toBeInTheDocument();
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
  expect(screen.getByLabelText(en.account.passwordCurrent)).not.toHaveAttribute('aria-invalid');
});

test('the screen is reachable — the route and the way to it both exist', async () => {
  stub();
  renderWithProviders(<AppRoutes />, { signedIn: true, route: '/account/password' });

  expect(
    await screen.findByRole('heading', { name: en.account.passwordTitle }),
  ).toBeInTheDocument();
  // A route only its author can navigate to is a route that does not exist.
  expect(screen.getByRole('link', { name: en.shell.navPassword })).toHaveAttribute(
    'href',
    '/account/password',
  );
});

test('every string comes from the resource file, in both languages', async () => {
  stub();
  render('ar');

  expect(
    await screen.findByRole('heading', { name: ar.account.passwordTitle }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(ar.account.passwordCurrent)).toBeInTheDocument();
  expect(ar.account.passwordTitle).not.toBe(en.account.passwordTitle);
});
