// Proves scripts/criteria/tickets.md section TICKETS-3-WEB. Assignment happens
// in the queue row: there is no route that reads one ticket and no story that
// asks for a detail screen, and the row already holds the ticket and its
// revision, which is everything the write needs.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

import type { Ticket } from './useTicketQueue';

// Typed, not inferred: `assigneeId: null` alone narrows the property to the
// literal `null`, and every spread that names somebody is then an error.
const TICKET: Ticket = {
  id: 't-1',
  subject: 'Subject t-1',
  status: 'new',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 1,
  allowedTransitions: ['open', 'pending', 'resolved'],
  resolutionNote: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const STAFF = [
  { id: 'staff-1', name: 'Sofia Martinez', role: 'agent' },
  { id: 'staff-2', name: 'Kenji Watanabe', role: 'agent' },
];

// A desk where the queue and the reference lists answer, and the PATCH is
// whatever the test says it is. Each PATCH body is recorded so an assertion
// can read the revision that was actually sent.
const desk = (patch: () => Response, ticket = TICKET) => {
  const patches: Array<Record<string, unknown>> = [];
  const stub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname.startsWith('/api/v1/ticket-categories'))
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    if (url.pathname.startsWith('/api/v1/assignees'))
      return Promise.resolve(json({ items: STAFF, total: STAFF.length, limit: 100, offset: 0 })());
    if (init?.method === 'PATCH') {
      patches.push(JSON.parse(String(init.body)));
      return Promise.resolve(patch());
    }
    return Promise.resolve(json({ items: [ticket], total: 1, limit: 25, offset: 0 })());
  });
  return { stub, patches };
};

afterEach(() => vi.unstubAllGlobals());

const picker = () => screen.getByLabelText(en.ticketAssign.label);
// The picker's own sentinel for "nobody". It is deliberately not the queue
// filter's 'none': one asks a question, the other performs a write, and the
// write's wire value is null.
const UNASSIGN_OPTION = '__unassigned__';
const assignButton = () => screen.getByRole('button', { name: en.ticketAssign.submit });

async function ready() {
  await waitFor(() => expect(screen.getByText(TICKET.subject)).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole('option', { name: 'Sofia Martinez' })).toBeInTheDocument());
}

test('the people offered are the API\'s live staff, and nobody is one of the choices', async () => {
  const { stub } = desk(json(TICKET));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  expect(screen.getByRole('option', { name: 'Kenji Watanabe' })).toBeInTheDocument();
  // Returning a ticket to nobody is an assignment, not a cleared field.
  expect(screen.getAllByRole('option', { name: en.ticketQueue.unassigned }).length).toBeGreaterThan(0);
});

test('assigning sends the revision the row was read at', async () => {
  const { stub, patches } = desk(json({ ...TICKET, assigneeId: 'staff-1', revision: 2 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'staff-1');
  await userEvent.click(assignButton());

  await waitFor(() => expect(patches).toHaveLength(1));
  expect(patches[0]).toEqual({ assigneeId: 'staff-1', revision: 1 });
});

test('a second assignment from the same row is not refused', async () => {
  // The failure this pins looks like a race and is not one: a screen that
  // keeps the revision it loaded with sends 1 twice, and the API correctly
  // refuses the agent's own second write.
  // The stub echoes whoever was asked for. A stub that always answers the
  // same person makes the second selection equal the current assignee, so the
  // button is correctly disabled and the test measures nothing.
  let revision = 1;
  const patches: Array<Record<string, unknown>> = [];
  const stub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname.startsWith('/api/v1/ticket-categories'))
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    if (url.pathname.startsWith('/api/v1/assignees'))
      return Promise.resolve(json({ items: STAFF, total: STAFF.length, limit: 100, offset: 0 })());
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      patches.push(body);
      revision += 1;
      return Promise.resolve(json({ ...TICKET, assigneeId: body.assigneeId, revision })());
    }
    return Promise.resolve(json({ items: [TICKET], total: 1, limit: 25, offset: 0 })());
  });
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'staff-1');
  await userEvent.click(assignButton());
  await waitFor(() => expect(patches).toHaveLength(1));

  await userEvent.selectOptions(picker(), 'staff-2');
  await userEvent.click(assignButton());
  await waitFor(() => expect(patches).toHaveLength(2));

  expect(patches[0].revision).toBe(1);
  expect(patches[1].revision).toBe(2);
});

test('unassigning sends null, not the filter\'s word for nobody', async () => {
  const { stub, patches } = desk(json({ ...TICKET, assigneeId: null, revision: 2 }), {
    ...TICKET,
    assigneeId: 'staff-1',
  });
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), UNASSIGN_OPTION);
  await userEvent.click(assignButton());

  await waitFor(() => expect(patches).toHaveLength(1));
  // 'none' is the QUEUE FILTER's word for unassigned. The write's word is null.
  expect(patches[0].assigneeId).toBeNull();
});

test('a stale revision says the ticket changed and offers to look again', async () => {
  const { stub } = desk(json({ code: 'REVISION_MISMATCH', requestId: 'rq' }, 409));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'staff-1');
  await userEvent.click(assignButton());

  await waitFor(() => expect(screen.getByText(en.ticketAssign.staleTitle)).toBeInTheDocument());
  // Not the generic "something went wrong at our end": the code says somebody
  // else changed it, and that is an action the agent can take.
  expect(screen.getByText(en.errors.REVISION_MISMATCH)).toBeInTheDocument();
  expect(screen.queryByText(en.errors.INTERNAL)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: en.ticketAssign.reload })).toBeInTheDocument();
});

test('any other failure is reported as itself, not as a stale write', async () => {
  const { stub } = desk(json({ code: 'INTERNAL', requestId: 'rq' }, 500));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'staff-1');
  await userEvent.click(assignButton());

  await waitFor(() => expect(screen.getByText(en.ticketAssign.failedTitle)).toBeInTheDocument());
  expect(screen.queryByText(en.ticketAssign.staleTitle)).not.toBeInTheDocument();
});

test('the row shows the assignee\'s name, not their id', async () => {
  const { stub } = desk(json(TICKET), { ...TICKET, assigneeId: 'staff-1' });
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  // The API returns an id and no name. The screen that needs the name is the
  // screen that has the list, so it resolves it rather than the queue endpoint
  // growing a join.
  // The name is on the page twice by design — once in the row's summary and
  // once as an option in the picker — so this asserts on the summary line
  // rather than on the page.
  await waitFor(() =>
    expect(screen.getByText(new RegExp(`${en.ticketQueue.statusNew}.*Sofia Martinez`))).toBeInTheDocument(),
  );
  expect(screen.queryByText(/staff-1/)).not.toBeInTheDocument();
});

test('assign is not offered until the staff list has arrived', async () => {
  let release: (value: Response) => void = () => {};
  const held = new Promise<Response>((r) => {
    release = r;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://desk.test');
      if (url.pathname.startsWith('/api/v1/assignees')) return held;
      if (url.pathname.startsWith('/api/v1/ticket-categories'))
        return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
      return Promise.resolve(json({ items: [TICKET], total: 1, limit: 25, offset: 0 })());
    }),
  );
  renderWithProviders(<TicketQueuePage />);
  await waitFor(() => expect(screen.getByText(TICKET.subject)).toBeInTheDocument());

  expect(picker()).toBeDisabled();
  release(json({ items: STAFF, total: 2, limit: 100, offset: 0 })());
  await waitFor(() => expect(picker()).not.toBeDisabled());
});
