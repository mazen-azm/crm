// Proves scripts/criteria/portal.md section PORTAL-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ticket = (over = {}) => ({
  id: 't-1',
  subject: 'The invoice is wrong',
  status: 'open',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 1,
  allowedTransitions: [],
  resolutionNote: null,
  channel: 'web',
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-08-30T09:00:00.000Z',
  ...over,
});

const page = (items: unknown[], total = items.length, offset = 0) => ({
  items,
  total,
  limit: 25,
  offset,
});

// /me says who is signed in; /me/tickets is theirs. Anything else is a route
// this screen must not be touching, and the stub says so by throwing.
function stub({ role = 'customer', tickets = page([ticket()]) } = {}) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    asked.push(url.pathname + url.search);
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'A Customer' }));
    }
    if (url.pathname === '/api/v1/me/tickets') return Promise.resolve(json(tickets));
    throw new Error(`this screen must not call ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

afterEach(() => vi.unstubAllGlobals());

const at = (route = '/', language?: 'en' | 'ar') =>
  renderWithProviders(<AppRoutes />, { signedIn: true, route, language });

test('a customer lands on their own tickets, not on the desk', async () => {
  const { asked } = stub();
  at('/');

  expect(await screen.findByRole('heading', { name: en.myTickets.title })).toBeInTheDocument();
  // findBy: the heading renders before the list answers, so a synchronous
  // getBy here looks for a ticket that has not arrived.
  expect(await screen.findByText('The invoice is wrong')).toBeInTheDocument();
  // Not the desk's dashboard. Asserted through the navigation rather than
  // through the page's own text, because HomePage renders t.home.heading —
  // the same string the shell already shows as the <h1>. A customer sees that
  // title either way, so it cannot tell the two pages apart. (Worth knowing:
  // the desk's landing page is the product's name repeated, which is a
  // separate thing and not this story's.)
  expect(screen.queryByRole('link', { name: en.shell.navQueue })).not.toBeInTheDocument();

  // /me/tickets, not /tickets. The queue is the desk's and the API refuses a
  // customer asking for it — the screen not asking is not the enforcement, but
  // asking would be a request that always fails.
  expect(asked.some((p) => p.startsWith('/api/v1/me/tickets'))).toBe(true);
  expect(asked.some((p) => p.startsWith('/api/v1/tickets'))).toBe(false);
});

test('the navigation a customer sees contains no staff screen', async () => {
  stub();
  at('/');

  await screen.findByRole('heading', { name: en.myTickets.title });
  for (const name of [en.shell.navCustomers, en.shell.navQueue, en.shell.navRaiseTicket]) {
    expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
  }
  // And an admin-only one is not there either.
  expect(screen.queryByRole('link', { name: en.shell.navSetPassword })).not.toBeInTheDocument();
  // What they do get is their own tickets.
  expect(screen.getByRole('link', { name: en.shell.navMyTickets })).toBeInTheDocument();
});

test('an agent’s experience is not narrowed by any of this', async () => {
  const { fetch } = stub({ role: 'agent' });
  at('/');

  // Both halves are pinned. A change that also hid the desk from staff would
  // break the queue an earlier sprint shipped, and only a test on this side
  // sees it.
  expect(await screen.findByRole('link', { name: en.shell.navQueue })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: en.shell.navCustomers })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: en.myTickets.title })).not.toBeInTheDocument();
  // And staff never ask for /me/tickets — they have the queue.
  expect(fetch.mock.calls.some(([i]) => String(i).includes('/me/tickets'))).toBe(false);
});

test('neither view is drawn before we know which person this is', async () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) =>
      String(input).endsWith('/me') ? pending : Promise.resolve(json(page([ticket()]))),
    ),
  );
  at('/');

  // Showing a customer the desk for the length of one request, then taking it
  // away, is worse than showing them nothing for the same moment.
  expect(screen.queryByRole('link', { name: en.shell.navQueue })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: en.myTickets.title })).not.toBeInTheDocument();

  release(json({ id: 'u-1', role: 'customer', name: 'A Customer' }));
  expect(await screen.findByRole('heading', { name: en.myTickets.title })).toBeInTheDocument();
});

test('a customer with nothing open is told so, and offered the way to say something', async () => {
  stub({ tickets: page([]) });
  at('/');

  expect(await screen.findByText(en.myTickets.emptyTitle)).toBeInTheDocument();
  // A real next action, and one that takes no account (D-2).
  expect(screen.getByRole('link', { name: en.myTickets.raiseOne })).toHaveAttribute('href', '/raise');
});

test('the list is paged by the API’s window, and the screen adds none', async () => {
  const { asked } = stub({ tickets: page([ticket()], 40) });
  at('/');

  await screen.findByText('The invoice is wrong');
  await userEvent.click(screen.getByRole('button', { name: en.myTickets.next }));

  expect(asked).toContain('/api/v1/me/tickets?limit=25&offset=25');
  // Previous is refused at the start, so nothing offers a page below zero.
  expect(screen.getByRole('button', { name: en.myTickets.previous })).toBeDisabled();
});

test('a refusal shows the shared sentence and offers to try again', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) =>
      String(input).endsWith('/me')
        ? Promise.resolve(json({ id: 'u-1', role: 'customer', name: 'A Customer' }))
        : Promise.resolve(json({ code: 'INTERNAL' }, 500)),
    ),
  );
  at('/');

  expect(await screen.findByText(en.myTickets.errorTitle)).toBeInTheDocument();
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: en.states.retry })).toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  stub();
  at('/', 'ar');

  expect(await screen.findByRole('heading', { name: ar.myTickets.title })).toBeInTheDocument();
  expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  expect(ar.myTickets.title).not.toBe(en.myTickets.title);
});
