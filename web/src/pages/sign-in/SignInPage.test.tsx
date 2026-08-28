// Proves scripts/criteria/identity.md section IDENTITY-1-WEB: the screen calls
// the API, stores the token the API returned, shows the code it was refused
// with, and clears the password when it was.
import { expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { AUTH_TOKEN_KEY } from '../../app/auth-context';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const signedIn = { token: 'a-token-the-api-issued', user: { id: 'u1', role: 'admin', name: 'Nadia' } };

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'admin@support-desk.local');
  await user.type(screen.getByLabelText('Password'), 'a password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

test('the token the API returned is the token the session stores', async () => {
  const fetchMock = vi.fn().mockResolvedValue(json(200, signedIn));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />);

  await fillAndSubmit(user);

  expect(await screen.findByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
  expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('a-token-the-api-issued');

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/v1/sign-in');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({
    email: 'admin@support-desk.local',
    password: 'a password',
  });
});

test('a refusal shows what the API said, and clears the password', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { code: 'UNAUTHENTICATED', requestId: 'r' })));
  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />);

  await fillAndSubmit(user);

  expect(await screen.findByText('That email and password do not match an account.')).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toHaveValue('');
  // The email is kept: retyping an address that was probably right is friction
  // with no security in it.
  expect(screen.getByLabelText('Email')).toHaveValue('admin@support-desk.local');
  expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Support Desk' })).toBeNull();
});

test('each documented code gets its own sentence, in the resource files', async () => {
  const cases = [
    [422, 'VALIDATION_FAILED', 'Check the highlighted fields and try again.'],
    [500, 'INTERNAL', 'Something went wrong at our end. Try again.'],
    [409, 'CONFLICT', 'Sign-in failed.'],
  ] as const;

  for (const [status, code, sentence] of cases) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(status, { code, requestId: 'r' })));
    const user = userEvent.setup();
    const view = renderWithProviders(<AppRoutes />);
    await fillAndSubmit(user);
    expect(await screen.findByText(sentence)).toBeInTheDocument();
    view.unmount();
  }
});

test('the form is disabled while the request is in flight', async () => {
  let release: (value: Response) => void = () => {};
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((r) => { release = r; })));
  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />);

  await fillAndSubmit(user);

  const button = screen.getByRole('button', { name: 'Signing in…' });
  expect(button).toBeDisabled();
  expect(screen.getByLabelText('Email')).toBeDisabled();

  release(json(200, signedIn));
  expect(await screen.findByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
});

test('the screen renders in Arabic, from the resource files', async () => {
  renderWithProviders(<AppRoutes />, { language: 'ar' });
  expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
  expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
});
