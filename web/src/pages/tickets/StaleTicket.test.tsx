// Proves scripts/criteria/tickets.md section TICKETS-13-WEB.
//
// Every control on the queue row that writes can be refused for one reason:
// somebody else changed the ticket first. This asserts they all say the same
// thing about it — by driving each one and comparing what appears, rather than
// by reading the resource file, which would only prove the file agrees with
// itself.
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

const STAFF = [{ id: 'staff-1', name: 'Sofia Martinez', role: 'agent' }];
const CATEGORIES = [{ id: 'cat-1', name: 'Billing' }];

// Every PATCH is refused as stale, whichever control sent it.
const desk = () => {
  const stub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'agent-1', role: 'agent', name: 'Omar Reilly' })());
    }
    if (url.pathname.startsWith('/api/v1/ticket-categories')) {
      return Promise.resolve(json({ items: CATEGORIES, total: 1, limit: 100, offset: 0 })());
    }
    if (url.pathname.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: STAFF, total: 1, limit: 100, offset: 0 })());
    }
    if (init?.method === 'PATCH') {
      return Promise.resolve(json({ code: 'REVISION_MISMATCH', requestId: 'r-1' }, 409)());
    }
    return Promise.resolve(json({ items: [TICKET], total: 1, limit: 25, offset: 0 })());
  });
  vi.stubGlobal('fetch', stub);
};

afterEach(() => vi.unstubAllGlobals());

// Each control, driven to its refusal.
const CONTROLS: Array<[string, (t: typeof en) => Promise<void>]> = [
  ['assign', async (t) => {
    await userEvent.selectOptions(screen.getByLabelText(t.ticketAssign.label), 'staff-1');
    await userEvent.click(screen.getByRole('button', { name: t.ticketAssign.submit }));
  }],
  ['file', async (t) => {
    await userEvent.selectOptions(screen.getByLabelText(t.ticketCategory.label), 'cat-1');
    await userEvent.click(screen.getByRole('button', { name: t.ticketCategory.submit }));
  }],
  ['move', async (t) => {
    await userEvent.selectOptions(screen.getByLabelText(t.ticketStatus.label), 'open');
    await userEvent.click(screen.getByRole('button', { name: t.ticketStatus.submit }));
  }],
];

async function ready(language?: 'en' | 'ar') {
  desk();
  renderWithProviders(<TicketQueuePage />, { language });
  await waitFor(() => expect(screen.getByText(TICKET.subject)).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole('option', { name: 'Sofia Martinez' })).toBeInTheDocument());
}

for (const [name, drive] of CONTROLS) {
  test(`the ${name} control says the one sentence when the ticket moved first`, async () => {
    await ready();
    await drive(en);

    // The same words whichever control was used. Three sentences for one cause
    // teach somebody that there are three causes.
    expect(await screen.findByText(en.ticketStale.title)).toBeInTheDocument();
    expect(screen.getByText(en.errors.REVISION_MISMATCH)).toBeInTheDocument();
    // And the same way out.
    expect(screen.getByRole('button', { name: en.ticketStale.reload })).toBeInTheDocument();
  });
}

test('it is not reported as a failure, because nothing failed', async () => {
  await ready();
  await drive_assign();

  async function drive_assign() {
    await userEvent.selectOptions(screen.getByLabelText(en.ticketAssign.label), 'staff-1');
    await userEvent.click(screen.getByRole('button', { name: en.ticketAssign.submit }));
  }

  await screen.findByText(en.ticketStale.title);
  // Somebody else got there first. Calling that a failure tells the reader
  // something went wrong when nothing did, and nothing was lost.
  expect(screen.queryByText(en.ticketAssign.failedTitle)).not.toBeInTheDocument();
  expect(screen.queryByText(en.errors.INTERNAL)).not.toBeInTheDocument();
});

test('only one of them is showing at a time', async () => {
  await ready();
  await CONTROLS[0][1](en);
  await screen.findByText(en.ticketStale.title);

  // One row, one ticket, one thing that happened to it. Two copies of the
  // sentence would be the row saying it twice about the same event.
  expect(screen.getAllByText(en.ticketStale.title)).toHaveLength(1);
});

test('the sentence is one string, not three that happen to match', async () => {
  // Read off the resource file rather than the screen: two keys with identical
  // English would pass every test above and drift the first time somebody
  // edited one. There is one key, and this is what says so.
  const keys = Object.entries(en).flatMap(([group, value]) =>
    typeof value === 'object' && value !== null
      ? Object.keys(value as Record<string, unknown>)
          .filter((k) => k === 'staleTitle' || (k === 'reload' && group !== 'ticketStale'))
          .map((k) => `${group}.${k}`)
      : [],
  );
  expect(keys).toEqual([]);
});

test('and it says it in Arabic too', async () => {
  await ready('ar');
  await CONTROLS[2][1](ar);

  expect(await screen.findByText(ar.ticketStale.title)).toBeInTheDocument();
  expect(ar.ticketStale.title).not.toBe(en.ticketStale.title);
});
