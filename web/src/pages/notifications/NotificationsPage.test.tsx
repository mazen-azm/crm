// Proves scripts/criteria/notifications.md section NOTIFICATIONS-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { UnreadNotifications } from '../../app/unread-notifications';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const NOTE = (over = {}) => ({
  id: 'n-1',
  ticketId: 't-1',
  kind: 'ticket.assigned',
  createdAt: '2026-08-30T09:00:00.000Z',
  readAt: null,
  ...over,
});

type Note = ReturnType<typeof NOTE>;

function desk({
  role = 'agent',
  items = [NOTE()],
  unread,
  total,
  marked = null,
}: {
  role?: string;
  items?: Note[];
  unread?: number;
  total?: number;
  marked?: null | (() => Response);
} = {}) {
  const unreadCount = unread ?? items.filter((n) => n.readAt === null).length;
  const matching = total ?? items.length;
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'Omar Reilly' })());
    }
    if (url.pathname.startsWith('/api/v1/assignees') || url.pathname.startsWith('/api/v1/ticket-categories')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    }
    if (url.pathname.endsWith('/read')) {
      return Promise.resolve((marked ?? json({ ...NOTE(), readAt: '2026-08-31T10:00:00.000Z' }))());
    }
    if (url.pathname === '/api/v1/me/notifications') {
      asked.push(url.search);
      return Promise.resolve(json({ items, total: matching, unread: unreadCount, limit: 20, offset: 0 })());
    }
    return Promise.resolve(json({ items: [], total: 0, limit: 25, offset: 0 })());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

afterEach(() => vi.unstubAllGlobals());

// The whole app, because the badge is in the shell and the page changes it —
// the point of the story is that those two agree.
const open = (route = '/notifications', language?: 'en' | 'ar') =>
  renderWithProviders(
    <UnreadNotifications>
      <AppRoutes />
    </UnreadNotifications>,
    { signedIn: true, route, language },
  );

test('the shell says how many are unread, from wherever you are', async () => {
  desk({ items: [NOTE(), NOTE({ id: 'n-2' })], unread: 2 });
  open('/tickets');

  // Not on the notifications screen. A notification nobody can see from the
  // screen they are on is one that waits until somebody goes looking.
  expect(await screen.findByRole('link', { name: `${en.shell.navNotifications} (2)` })).toBeInTheDocument();
});

test('no badge at all when there are none, rather than a zero', async () => {
  desk({ items: [], unread: 0, total: 0 });
  open('/tickets');

  // A zero is a thing to read and dismiss, every time, forever.
  expect(await screen.findByRole('link', { name: en.shell.navNotifications })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /\(0\)/ })).not.toBeInTheDocument();
});

test('each row says what happened and gets to the ticket in one click', async () => {
  desk();
  open();

  expect(await screen.findByText(en.notifications.ticketAssigned)).toBeInTheDocument();
  const link = screen.getByRole('link', { name: en.notifications.openTicket });
  expect(link).toHaveAttribute('href', expect.stringContaining('t-1'));
});

test('opening the list marks nothing', async () => {
  const { fetch } = desk();
  open();
  await screen.findByText(en.notifications.ticketAssigned);

  // An agent who glances at the screen has not dismissed what is on it.
  const marks = fetch.mock.calls.filter(([i]) => String(i).endsWith('/read'));
  expect(marks).toEqual([]);
  expect(screen.getByRole('button', { name: en.notifications.markRead })).toBeInTheDocument();
});

test('marking one read updates the row and the shell, without asking again', async () => {
  const { fetch, asked } = desk({ items: [NOTE(), NOTE({ id: 'n-2' })], unread: 2 });
  open();
  await screen.findAllByText(en.notifications.ticketAssigned);
  const before = asked.length;

  await userEvent.click(screen.getAllByRole('button', { name: en.notifications.markRead })[0]);

  // The row follows the answer the write returned.
  await waitFor(() => expect(screen.getByText(new RegExp(en.notifications.readAt))).toBeInTheDocument());
  // And so does the badge — one fewer, from the same answer.
  await waitFor(() =>
    expect(screen.getByRole('link', { name: `${en.shell.navNotifications} (1)` })).toBeInTheDocument(),
  );
  // No refetch of the list: it would lose the reader's place, and the write
  // already said what changed.
  expect(asked.length).toBe(before);
  expect(fetch.mock.calls.filter(([i]) => String(i).endsWith('/read'))).toHaveLength(1);
});

test('a read one keeps its place and offers no button', async () => {
  desk({ items: [NOTE({ readAt: '2026-08-30T12:00:00.000Z' })], unread: 0 });
  open();

  await screen.findByText(new RegExp(en.notifications.readAt));
  // Still listed — "I read this yesterday" is something somebody may want to
  // see again, which is why reading is a column and not a delete.
  expect(screen.getByText(en.notifications.ticketAssigned)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: en.notifications.markRead })).not.toBeInTheDocument();
});

test('none at all says so rather than showing an empty frame', async () => {
  desk({ items: [], unread: 0, total: 0 });
  open();

  expect(await screen.findByText(en.notifications.emptyTitle)).toBeInTheDocument();
});

test('a failed mark says so and leaves the row unread', async () => {
  desk({ marked: json({ code: 'INTERNAL', requestId: 'r-1' }, 500) });
  open();
  await screen.findByText(en.notifications.ticketAssigned);

  await userEvent.click(screen.getByRole('button', { name: en.notifications.markRead }));

  expect(await screen.findByText(en.notifications.markFailedTitle)).toBeInTheDocument();
  // Still unread, so it can be tried again.
  expect(screen.getByRole('button', { name: en.notifications.markRead })).toBeInTheDocument();
});

test('a customer is told, and nothing is asked on their behalf', async () => {
  const { fetch } = desk({ role: 'customer' });
  open();

  expect(await screen.findByText(en.notifications.staffOnlyTitle)).toBeInTheDocument();
  // Nothing writes a notification for a customer, so asking would be a request
  // refused on every screen they open.
  const asks = fetch.mock.calls.filter(([i]) => String(i).includes('/me/notifications'));
  expect(asks).toEqual([]);
});

test('every string comes from the resource file, in both languages', async () => {
  desk();
  open('/notifications', 'ar');

  expect(await screen.findByRole('heading', { name: ar.notifications.title })).toBeInTheDocument();
  // findBy: the heading renders before the list answers, so a synchronous
  // query here looks for a row that has not arrived.
  expect(await screen.findByRole('button', { name: ar.notifications.markRead })).toBeInTheDocument();
  expect(ar.notifications.ticketAssigned).not.toBe(en.notifications.ticketAssigned);
});
