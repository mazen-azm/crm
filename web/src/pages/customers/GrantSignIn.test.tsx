// Proves scripts/criteria/customers.md section CUSTOMERS-6-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { CustomerScreenPage } from './CustomerScreenPage';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'c-1' }) };
});

// A FRESH Response per call — a body is read once, and reusing one shows up as
// a test that times out rather than one that mentions bodies (L-30).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const CUSTOMER = {
  id: 'c-1',
  name: 'Aiko Tanaka',
  email: 'aiko@example.com',
  phone: '+81 90 0000 0000',
  hasSignIn: false,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
};

const SCREEN = (over = {}) => ({
  customer: { ...CUSTOMER, ...over },
  tickets: { items: [], total: 0, limit: 25, offset: 0 },
  notes: { items: [], total: 0 },
});

const GRANTED = {
  customer: { ...CUSTOMER, hasSignIn: true },
  user: { id: 'u-9', email: 'aiko@example.com', name: 'Aiko Tanaka', role: 'customer' },
  initialPassword: 'Hx7-read-this-aloud',
};

// Answers by path, and records what was asked, so a test can say which request
// was made rather than counting calls in order.
function stub({ customer = SCREEN(), grant = () => json(GRANTED, 201) } = {}) {
  const posted: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://desk.test').pathname;
    if (init?.method === 'POST') posted.push(path);
    if (path.endsWith('/sign-in')) return Promise.resolve(grant());
    if (path.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 }));
    }
    return Promise.resolve(json(customer));
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, posted };
}

afterEach(() => vi.unstubAllGlobals());

const render = (language?: 'en' | 'ar') =>
  renderWithProviders(<CustomerScreenPage />, { signedIn: true, language });

test('a customer with no sign-in is offered one, and the password comes back once', async () => {
  const { posted } = stub();
  render();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.signInGrant }));

  // Once, in full, unmasked — the agent is on the phone and has to read it out.
  expect(await screen.findByText(GRANTED.initialPassword)).toBeInTheDocument();
  expect(screen.getByText(en.customerScreen.signInReady)).toBeInTheDocument();
  expect(screen.getAllByText(GRANTED.user.email).length).toBeGreaterThan(0);

  // The route the API actually serves, and request() prefixes /api/v1 itself.
  expect(posted).toEqual(['/api/v1/customers/c-1/sign-in']);
});

test('the offer is gone once it has been taken, so nothing invites a second grant', async () => {
  stub();
  render();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.signInGrant }));
  await screen.findByText(GRANTED.initialPassword);

  expect(
    screen.queryByRole('button', { name: en.customerScreen.signInGrant }),
  ).not.toBeInTheDocument();
});

test('a customer who already has one gets a statement, not a button', async () => {
  const { posted } = stub({ customer: SCREEN({ hasSignIn: true }) });
  render();

  expect(await screen.findByText(en.customerScreen.signInAlready)).toBeInTheDocument();
  // An action that will certainly be refused is worse than no action.
  expect(
    screen.queryByRole('button', { name: en.customerScreen.signInGrant }),
  ).not.toBeInTheDocument();
  expect(posted).toEqual([]);
});

test('a second press while the first is in flight is not a second account', async () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const { fetch } = stub({ grant: () => pending as unknown as Response });
  render();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.signInGrant }));
  const busy = await screen.findByRole('button', { name: en.customerScreen.signInGranting });
  expect(busy).toBeDisabled();

  // Clicked through the disabled attribute: that is only the first guard, and
  // the hook refuses a call while one is in flight — which is what a keyboard
  // repeat meets.
  await userEvent.click(busy, { pointerEventsCheck: 0 });
  const grants = fetch.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST');
  expect(grants).toHaveLength(1);

  release(json(GRANTED, 201));
  expect(await screen.findByText(GRANTED.initialPassword)).toBeInTheDocument();
});

test('a refusal shows the shared sentence for its code, and offers the action again', async () => {
  stub({ grant: () => json({ code: 'CONFLICT' }, 409) });
  render();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.signInGrant }));

  expect(await screen.findByText(en.customerScreen.signInFailed)).toBeInTheDocument();
  expect(screen.getByText(en.errors.CONFLICT)).toBeInTheDocument();
  // Still offered: a refusal is not a state change, and the agent may want to
  // reload and see why.
  expect(screen.getByRole('button', { name: en.customerScreen.signInGrant })).toBeInTheDocument();
});

test('a customer with no address is refused and the sentence says which', async () => {
  stub({
    customer: SCREEN({ email: null }),
    grant: () => json({ code: 'VALIDATION_FAILED', fields: ['email'] }, 422),
  });
  render();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.signInGrant }));

  await waitFor(() =>
    expect(screen.getByText(en.errors.VALIDATION_FAILED)).toBeInTheDocument(),
  );
});

test('every string comes from the resource file, in both languages', async () => {
  stub();
  render('ar');

  expect(
    await screen.findByRole('heading', { name: ar.customerScreen.signInHeading }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: ar.customerScreen.signInGrant }),
  ).toBeInTheDocument();
  expect(ar.customerScreen.signInGrant).not.toBe(en.customerScreen.signInGrant);
});
