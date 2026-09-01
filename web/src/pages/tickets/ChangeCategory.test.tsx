// Proves scripts/criteria/tickets.md section TICKETS-10-WEB. Filing happens in
// the queue row, beside assigning, for the reason assigning does: the row
// already holds the ticket and the revision, which is everything the write
// needs, and there is no detail screen.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor, within } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';
import type { Ticket } from './useTicketQueue';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TICKET: Ticket = {
  id: 't-1',
  customerId: 'c-1',
  subject: 'Subject t-1',
  status: 'new',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 4,
  reopenWindowOpen: false,
  breaches: [],
  allowedTransitions: ['open', 'pending', 'resolved'],
  resolutionNote: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const CATEGORIES = [
  { id: 'cat-1', name: 'Billing' },
  { id: 'cat-2', name: 'Refunds' },
];

// The categories the API says are live. A retired one is simply not in this
// list — the API leaves it off, and the picker shows what it was given.
const desk = (patch: () => Response, ticket = TICKET, categories = CATEGORIES) => {
  const patches: Array<{ path: string; body: Record<string, unknown> }> = [];
  const stub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me')
      return Promise.resolve(json({ id: 'agent-1', role: 'agent', name: 'Omar Reilly' })());
    if (url.pathname.startsWith('/api/v1/ticket-categories'))
      return Promise.resolve(json({ items: categories, total: categories.length, limit: 100, offset: 0 })());
    if (url.pathname.startsWith('/api/v1/assignees'))
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    if (init?.method === 'PATCH') {
      patches.push({ path: url.pathname, body: JSON.parse(String(init.body)) });
      return Promise.resolve(patch());
    }
    return Promise.resolve(json({ items: [ticket], total: 1, limit: 25, offset: 0 })());
  });
  return { stub, patches };
};

afterEach(() => vi.unstubAllGlobals());

const picker = (t = en) => screen.getByLabelText(t.ticketCategory.label);
const button = (t = en) => screen.getByRole('button', { name: t.ticketCategory.submit });

async function ready(language?: 'en' | 'ar') {
  renderWithProviders(<TicketQueuePage />, { language });
  await waitFor(() => expect(screen.getByText(TICKET.subject)).toBeInTheDocument());
  // Scoped to the row's picker. "Billing" is also an option in the queue's
  // category FILTER at the top of the page, and an unscoped query matches
  // both — the two controls ask different questions and share their words.
  await waitFor(() => expect(within(picker(language === 'ar' ? ar : en)).getByRole('option', { name: 'Billing' })).toBeInTheDocument());
}

test('the picker offers live categories and no category, and nothing else', async () => {
  const { stub } = desk(json(TICKET));
  vi.stubGlobal('fetch', stub);
  await ready();

  const options = [...picker().querySelectorAll('option')].map((o) => o.textContent);
  // Exactly three: the two live ones and the word for none. Not a blank
  // option, not a retired one, not a "choose" placeholder that could be
  // submitted — a ticket always has an answer to what it is filed under, and
  // "no category" is one of the answers.
  expect(options).toEqual([en.ticketCategory.none, 'Billing', 'Refunds']);
});

test('a category is changed, and the row shows it without reloading the queue', async () => {
  const filed = { ...TICKET, categoryId: 'cat-2', revision: 5 };
  const { stub, patches } = desk(json(filed));
  vi.stubGlobal('fetch', stub);
  await ready();

  await userEvent.selectOptions(picker(), 'cat-2');
  await userEvent.click(button());

  await waitFor(() => expect(patches).toHaveLength(1));
  expect(patches[0].path).toBe('/api/v1/tickets/t-1/category');
  // The revision that was read (BR-5), so a change somebody else made in the
  // meantime refuses this rather than being overwritten.
  expect(patches[0].body).toEqual({ categoryId: 'cat-2', revision: 4 });

  // The row follows the answer. The queue is not re-fetched: one PATCH and no
  // second GET, because the response carries the ticket.
  await waitFor(() => expect(picker()).toHaveValue('cat-2'));
  const queueReads = stub.mock.calls.filter(([i, init]) => {
    const path = new URL(String(i), 'http://desk.test').pathname;
    return path === '/api/v1/tickets' && (init as RequestInit | undefined)?.method === undefined;
  });
  expect(queueReads).toHaveLength(1);
});

test('the row carries the new revision, so the next write is not refused', async () => {
  const filed = { ...TICKET, categoryId: 'cat-2', revision: 5 };
  const { stub, patches } = desk(json(filed));
  vi.stubGlobal('fetch', stub);
  await ready();

  await userEvent.selectOptions(picker(), 'cat-2');
  await userEvent.click(button());
  await waitFor(() => expect(picker()).toHaveValue('cat-2'));

  await userEvent.selectOptions(picker(), 'cat-1');
  await userEvent.click(button());

  // 5, not 4. A screen that kept the revision it loaded with refuses the
  // agent's own second change, and the bug reads as a race that is not there.
  await waitFor(() => expect(patches).toHaveLength(2));
  expect(patches[1].body).toEqual({ categoryId: 'cat-1', revision: 5 });
});

test('taking the category off is a change, not a cleared field', async () => {
  const carried = { ...TICKET, categoryId: 'cat-1' };
  const { stub, patches } = desk(json({ ...carried, categoryId: null, revision: 5 }), carried);
  vi.stubGlobal('fetch', stub);
  await ready();

  expect(picker()).toHaveValue('cat-1');
  await userEvent.selectOptions(picker(), '__no_category__');
  await userEvent.click(button());

  // null on the wire, not an omitted field: the API treats "no category" as an
  // ordinary value and refuses a missing one with a 422.
  await waitFor(() => expect(patches).toHaveLength(1));
  expect(patches[0].body).toEqual({ categoryId: null, revision: 4 });
});

test('the button does nothing until the choice is a change', async () => {
  const { stub, patches } = desk(json(TICKET));
  vi.stubGlobal('fetch', stub);
  await ready();

  // Already "no category", and that is what the picker shows. Sending the
  // value the ticket already has would bump its revision for nothing and put
  // a row in the audit trail saying nothing happened.
  expect(button()).toBeDisabled();

  await userEvent.selectOptions(picker(), 'cat-1');
  expect(button()).toBeEnabled();
  await userEvent.selectOptions(picker(), '__no_category__');
  expect(button()).toBeDisabled();
  expect(patches).toEqual([]);
});

test('a stale revision says the ticket changed, and offers to look again', async () => {
  const { stub } = desk(json({ code: 'REVISION_MISMATCH', requestId: 'r-1' }, 409));
  vi.stubGlobal('fetch', stub);
  await ready();

  await userEvent.selectOptions(picker(), 'cat-1');
  await userEvent.click(button());

  // 409 is not "something went wrong". Somebody else changed the ticket, and
  // the only useful next action is to look at it again — the same shape
  // assignment and the status move already use.
  expect(await screen.findByText(en.ticketStale.title)).toBeInTheDocument();
  expect(screen.getByText(en.errors.REVISION_MISMATCH)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: en.ticketStale.reload })).toBeInTheDocument();
});

test('any other refusal is reported without pretending it was a conflict', async () => {
  const { stub } = desk(json({ code: 'VALIDATION_FAILED', fields: ['categoryId'] }, 422));
  vi.stubGlobal('fetch', stub);
  await ready();

  await userEvent.selectOptions(picker(), 'cat-1');
  await userEvent.click(button());

  expect(await screen.findByText(en.ticketCategory.failedTitle)).toBeInTheDocument();
  expect(screen.getByText(en.errors.VALIDATION_FAILED)).toBeInTheDocument();
  // A retired category is refused by the API this way, and it is not a stale
  // revision — telling somebody to reload would send them round a loop.
  expect(screen.queryByText(en.ticketStale.title)).not.toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  const { stub } = desk(json(TICKET));
  vi.stubGlobal('fetch', stub);
  await ready('ar');

  expect(picker(ar)).toBeInTheDocument();
  expect(button(ar)).toBeInTheDocument();
  expect(within(picker(ar)).getByRole('option', { name: ar.ticketCategory.none })).toBeInTheDocument();
  expect(ar.ticketCategory.none).not.toBe(en.ticketCategory.none);
});
