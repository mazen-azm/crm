// Proves scripts/criteria/tickets.md section TICKETS-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';

// A FRESH Response per call. A body can be read once (L-30).
const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ticket = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  subject: `Subject ${id}`,
  status: 'new',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 1,
  allowedTransitions: ['open', 'pending', 'resolved'],
  resolutionNote: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...extra,
});

const CATEGORIES = { items: [{ id: 'cat-1', name: 'Billing' }], total: 1, limit: 100, offset: 0 };
const ASSIGNEES = {
  items: [{ id: 'staff-1', name: 'Sofia Martinez', role: 'agent' }],
  total: 1,
  limit: 100,
  offset: 0,
};

// Routes by path so a test says what each endpoint answers, and records the
// queue calls so an assertion can read what was actually asked for.
const desk = (queue: () => Response) => {
  const calls: URL[] = [];
  const stub = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    // The reference lists the screen loads alongside the queue. Recorded
    // separately so an assertion about "what the queue was asked for" is not
    // reading whichever request happened to be last.
    if (url.pathname.startsWith('/api/v1/ticket-categories')) return Promise.resolve(json(CATEGORIES)());
    if (url.pathname.startsWith('/api/v1/assignees')) return Promise.resolve(json(ASSIGNEES)());
    calls.push(url);
    return Promise.resolve(queue());
  });
  return { stub, calls };
};

const lastQuery = (calls: URL[]) => calls[calls.length - 1].searchParams;

afterEach(() => vi.unstubAllGlobals());

test('the queue is asked for, and what it returns is what is shown', async () => {
  const { stub } = desk(json({ items: [ticket('t-1'), ticket('t-2')], total: 2, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);

  await waitFor(() => expect(screen.getByText('Subject t-1')).toBeInTheDocument());
  expect(screen.getByText('Subject t-2')).toBeInTheDocument();
});

test('applying a filter asks the API rather than filtering what is held', async () => {
  const { stub, calls } = desk(json({ items: [ticket('t-1')], total: 1, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await waitFor(() => expect(screen.getByText('Subject t-1')).toBeInTheDocument());

  const before = calls.length;
  await userEvent.selectOptions(
    screen.getByLabelText(en.ticketQueue.filterStatus),
    'open',
  );
  await userEvent.click(screen.getByRole('button', { name: en.ticketQueue.apply }));

  await waitFor(() => expect(calls.length).toBeGreaterThan(before));
  expect(lastQuery(calls).get('status')).toBe('open');
});

test('unassigned is sent as the API\'s word for it, and "any" sends nothing', async () => {
  const { stub, calls } = desk(json({ items: [ticket('t-1')], total: 1, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await waitFor(() => expect(screen.getByText('Subject t-1')).toBeInTheDocument());

  await userEvent.selectOptions(screen.getByLabelText(en.ticketQueue.filterAssignee), 'none');
  await userEvent.click(screen.getByRole('button', { name: en.ticketQueue.apply }));
  await waitFor(() => expect(lastQuery(calls).get('assigneeId')).toBe('none'));

  // Back to "any": the parameter is omitted, not sent empty. An empty string
  // would be an assignee id that cannot exist.
  await userEvent.selectOptions(screen.getByLabelText(en.ticketQueue.filterAssignee), '');
  await userEvent.click(screen.getByRole('button', { name: en.ticketQueue.apply }));
  await waitFor(() => expect(lastQuery(calls).has('assigneeId')).toBe(false));
});

test('a filter in the URL is the filter that is asked for', async () => {
  const { stub, calls } = desk(json({ items: [ticket('t-1')], total: 1, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  // The same rows come back on a reload because the filter lives in the URL
  // and not in memory — this render IS the reload.
  renderWithProviders(<TicketQueuePage />, { route: '/tickets?status=pending&offset=25' });

  await waitFor(() => expect(calls.length).toBeGreaterThan(0));
  expect(lastQuery(calls).get('status')).toBe('pending');
  expect(lastQuery(calls).get('offset')).toBe('25');
});

test('paging uses the API\'s window and adds none of its own', async () => {
  const { stub, calls } = desk(json({ items: [ticket('t-1')], total: 60, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await waitFor(() => expect(screen.getByText('Subject t-1')).toBeInTheDocument());

  expect(screen.getByRole('button', { name: en.ticketQueue.previous })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: en.ticketQueue.next }));

  await waitFor(() => expect(lastQuery(calls).get('offset')).toBe('25'));
  expect(lastQuery(calls).get('limit')).toBe('25');
});

test('applying a filter goes back to the first page', async () => {
  const { stub, calls } = desk(json({ items: [ticket('t-1')], total: 60, limit: 25, offset: 25 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />, { route: '/tickets?offset=25' });
  await waitFor(() => expect(screen.getByText('Subject t-1')).toBeInTheDocument());

  await userEvent.selectOptions(screen.getByLabelText(en.ticketQueue.filterPriority), 'urgent');
  await userEvent.click(screen.getByRole('button', { name: en.ticketQueue.apply }));

  // Keeping the offset would show page two of a result that may have one page.
  await waitFor(() => expect(lastQuery(calls).get('priority')).toBe('urgent'));
  expect(lastQuery(calls).get('offset')).toBe('0');
});

test('an empty result names the filters that produced it and offers to clear them', async () => {
  const { stub, calls } = desk(json({ items: [], total: 0, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />, { route: '/tickets?status=closed&priority=urgent' });

  await waitFor(() => expect(screen.getByText(en.ticketQueue.emptyTitle)).toBeInTheDocument());
  const body = screen.getByText(new RegExp(en.ticketQueue.emptyFiltered));
  expect(body).toHaveTextContent(en.ticketQueue.statusClosed);
  expect(body).toHaveTextContent(en.ticketQueue.priorityUrgent);

  await userEvent.click(screen.getByRole('button', { name: en.ticketQueue.clear }));
  await waitFor(() => expect(lastQuery(calls).has('status')).toBe(false));
  expect(lastQuery(calls).has('priority')).toBe(false);
});

test('an empty queue with no filters does not offer to clear them', async () => {
  const { stub } = desk(json({ items: [], total: 0, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);

  await waitFor(() => expect(screen.getByText(en.ticketQueue.emptyUnfiltered)).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: en.ticketQueue.clear })).not.toBeInTheDocument();
});

test('a failure says what the code means', async () => {
  const { stub } = desk(json({ code: 'INTERNAL', requestId: 'rq' }, 500));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);

  await waitFor(() => expect(screen.getByText(en.ticketQueue.errorTitle)).toBeInTheDocument());
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
});

test('every status the machine knows can be filtered for', async () => {
  const { stub } = desk(json({ items: [], total: 0, limit: 25, offset: 0 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);

  // A queue that cannot select `new` hides the tickets nobody has picked up,
  // which is the one view an agent opens the queue for.
  for (const label of [
    en.ticketQueue.statusNew,
    en.ticketQueue.statusOpen,
    en.ticketQueue.statusPending,
    en.ticketQueue.statusResolved,
    en.ticketQueue.statusClosed,
    en.ticketQueue.statusReopened,
  ]) {
    expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
  }
});
