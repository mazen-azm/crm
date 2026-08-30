// Proves scripts/criteria/tickets.md section TICKETS-7-WEB on the screen:
// order, the empty state, the localised stamp, and the API's window.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { TicketHistory } from './TicketHistory';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

// A FRESH Response per call. A body is read once, so a reused instance makes
// the second caller's .json() throw — which shows up as a test that times out
// rather than one that mentions bodies (L-30).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const STAFF = {
  items: [
    { id: 'u-1', name: 'Sofia', role: 'agent' },
    { id: 'u-2', name: 'Karim', role: 'agent' },
  ],
  total: 2,
  limit: 100,
  offset: 0,
};

const RAISED = {
  id: 'a-1',
  actorId: 'u-1',
  verb: 'ticket.create',
  at: '2026-08-30T09:00:00.000Z',
  before: null,
  after: { status: 'new', priority: 'normal' },
};
const ASSIGNED = {
  id: 'a-2',
  actorId: 'u-1',
  verb: 'ticket.assign',
  at: '2026-08-30T10:00:00.000Z',
  before: { assigneeId: null },
  after: { assigneeId: 'u-2' },
};
const MOVED = {
  id: 'a-3',
  actorId: null,
  verb: 'ticket.status',
  at: '2026-08-30T11:00:00.000Z',
  before: { status: 'new' },
  after: { status: 'open' },
};

// Answers by path, and records the history URLs so a test can say which window
// was asked for rather than counting calls in order.
function stub(history: Array<Record<string, unknown>>) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname.startsWith('/api/v1/assignees')) return Promise.resolve(json(STAFF));
    if (url.pathname.includes('/history')) {
      asked.push(url.pathname + url.search);
      const page = history.shift();
      if (!page) throw new Error(`no history page left for ${url}`);
      return Promise.resolve(json(page));
    }
    throw new Error(`no stub for ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

// The row hands its staff list in; this stands in for it with the same shape.
const assignees = {
  status: 'success' as const,
  error: null,
  assignees: STAFF.items,
  nameFor: (id: string | null) =>
    id === null ? null : (STAFF.items.find((s) => s.id === id)?.name ?? id),
  reload: () => {},
};

// The sentences carry invisible bidi isolates around every substituted value;
// they are what keeps a Latin name from dragging the full stop with it in an
// Arabic paragraph. Stripped here so an assertion reads as the sentence does.
const plain = (line: string) => line.replace(/[\u2068\u2069]/g, '');

const open = async () =>
  userEvent.click(await screen.findByRole('button', { name: en.ticketHistory.show }));

afterEach(() => vi.unstubAllGlobals());

test('the history is not read until somebody asks for it', async () => {
  const { fetch } = stub([{ items: [RAISED], total: 1, limit: 20, offset: 0 }]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);

  // The queue shows twenty-five of these at once. A row that read its own
  // trail on mount would make one page twenty-five requests.
  await screen.findByRole('button', { name: en.ticketHistory.show });
  expect(fetch).not.toHaveBeenCalled();

  await open();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
});

test('every entry is a sentence, in the order the API gave them', async () => {
  stub([{ items: [RAISED, ASSIGNED, MOVED], total: 3, limit: 20, offset: 0 }]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);
  await open();

  const lines = (await screen.findAllByRole('listitem')).map((li) => plain(li.textContent ?? ''));
  expect(lines).toHaveLength(3);
  expect(lines[0]).toContain('Sofia raised this ticket.');
  expect(lines[1]).toContain('Sofia assigned this to Karim.');
  // A null actor is the system, and it says so rather than leaving a gap.
  expect(lines[2]).toContain('the system moved this from New to Open.');

  // The verb never reaches the screen.
  expect(document.body.textContent).not.toContain('ticket.status');
});

test('the order is the API\u2019s, not one the screen decides', async () => {
  // Handed back newest first, which is not the order the route promises. The
  // screen renders what it was given: a second sort here would be a second
  // answer to what order means, and it would hide the day the API's changed.
  stub([{ items: [MOVED, ASSIGNED, RAISED], total: 3, limit: 20, offset: 0 }]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);
  await open();

  const lines = (await screen.findAllByRole('listitem')).map((li) => plain(li.textContent ?? ''));
  expect(lines[0]).toContain('the system moved this');
  expect(lines[1]).toContain('assigned this to Karim');
  expect(lines[2]).toContain('raised this ticket');
});

test('the stamp is in the reader’s locale, never the raw UTC string', async () => {
  stub([{ items: [RAISED], total: 1, limit: 20, offset: 0 }]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);
  await open();

  const line = await screen.findByRole('listitem');
  expect(plain(line.textContent ?? '')).not.toContain('2026-08-30T09:00:00.000Z');
  expect(plain(line.textContent ?? '')).toMatch(/2026/);
});

test('an empty history says so rather than showing a blank region', async () => {
  stub([{ items: [], total: 0, limit: 20, offset: 0 }]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);
  await open();

  expect(await screen.findByText(en.ticketHistory.emptyTitle)).toBeInTheDocument();
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});

test('more is offered only when the API says there is more, and asks for its own window', async () => {
  const { asked } = stub([
    { items: [RAISED], total: 2, limit: 1, offset: 0 },
    { items: [MOVED], total: 2, limit: 1, offset: 1 },
  ]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);
  await open();

  await userEvent.click(await screen.findByRole('button', { name: en.ticketHistory.loadMore }));

  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
  // The first page carries no limit — the window is the API's, not a page size
  // this screen invented (BR-4) — and the second asks from where the first
  // stopped.
  expect(asked).toEqual(['/api/v1/tickets/t-1/history', '/api/v1/tickets/t-1/history?offset=1']);
  // Nothing left, so nothing is offered.
  expect(
    screen.queryByRole('button', { name: en.ticketHistory.loadMore }),
  ).not.toBeInTheDocument();
});

test('a whole history in one page offers no more', async () => {
  stub([{ items: [RAISED, MOVED], total: 2, limit: 20, offset: 0 }]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);
  await open();

  await screen.findAllByRole('listitem');
  expect(
    screen.queryByRole('button', { name: en.ticketHistory.loadMore }),
  ).not.toBeInTheDocument();
});

test('a refusal shows the shared sentence for its code', async () => {
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname.startsWith('/api/v1/assignees')) return Promise.resolve(json(STAFF));
    return Promise.resolve(json({ code: 'NOT_FOUND' }, 404));
  });
  vi.stubGlobal('fetch', fetch);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />);
  await open();

  expect(await screen.findByText(en.ticketHistory.errorTitle)).toBeInTheDocument();
  expect(screen.getByText(en.errors.NOT_FOUND)).toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  stub([{ items: [MOVED], total: 1, limit: 20, offset: 0 }]);
  renderWithProviders(<TicketHistory ticketId="t-1" assignees={assignees} />, { language: 'ar' });

  await userEvent.click(await screen.findByRole('button', { name: ar.ticketHistory.show }));

  expect(await screen.findByRole('heading', { name: ar.ticketHistory.heading })).toBeInTheDocument();
  // The whole sentence, in Arabic, with the status words in Arabic too.
  expect(plain(screen.getByRole('listitem').textContent ?? '')).toContain(
    `نقل ${ar.ticketHistory.systemActor} هذه التذكرة من ${ar.ticketQueue.statusNew} إلى ${ar.ticketQueue.statusOpen}.`,
  );
  expect(ar.ticketHistory.heading).not.toBe(en.ticketHistory.heading);
});
