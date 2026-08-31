// Proves scripts/criteria/tickets.md section TICKETS-5-WEB. Like assignment,
// this happens in the queue row: there is no route that reads one ticket.
import { afterEach, expect, test, vi } from 'vitest';

import { within } from '@testing-library/react';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';
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
  revision: 1,
  reopenWindowOpen: false,
  allowedTransitions: ['open', 'pending', 'resolved'],
  resolutionNote: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const desk = (patch: () => Response, ticket: Ticket = TICKET) => {
  const patches: Array<Record<string, unknown>> = [];
  const stub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname.startsWith('/api/v1/ticket-categories'))
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    if (url.pathname.startsWith('/api/v1/assignees'))
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    if (init?.method === 'PATCH' && url.pathname.endsWith('/status')) {
      patches.push(JSON.parse(String(init.body)));
      return Promise.resolve(patch());
    }
    return Promise.resolve(json({ items: [ticket], total: 1, limit: 25, offset: 0 })());
  });
  return { stub, patches };
};

afterEach(() => vi.unstubAllGlobals());

const picker = () => screen.getByLabelText(en.ticketStatus.label);
// Scoped to the row's own picker: the queue FILTER at the top of the page
// offers the same status names, and an unscoped query matches both.
const moves = () => within(picker());
const moveButton = () => screen.getByRole('button', { name: en.ticketStatus.submit });
const ready = () => waitFor(() => expect(screen.getByText(TICKET.subject)).toBeInTheDocument());

test('only the moves the ticket says are legal are offered', async () => {
  const { stub } = desk(json(TICKET));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  // The ticket carries them. The six statuses and their edges are not in the
  // client, so this list can only have come from the API.
  expect(moves().getByRole('option', { name: en.ticketQueue.statusOpen })).toBeInTheDocument();
  expect(moves().getByRole('option', { name: en.ticketQueue.statusResolved })).toBeInTheDocument();
  // Not legal from `new`, and so not offered — before any refusal has happened.
  expect(moves().queryByRole('option', { name: en.ticketQueue.statusClosed })).not.toBeInTheDocument();
  expect(moves().queryByRole('option', { name: en.ticketQueue.statusReopened })).not.toBeInTheDocument();
});

test('a ticket with nowhere to go offers no control at all', async () => {
  const { stub } = desk(json(TICKET), { ...TICKET, status: 'closed', allowedTransitions: [] });
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  // [] is an answer — "nothing would have worked" — not a missing field. A
  // screen reading it as "unknown, offer everything" would offer moves that
  // cannot happen.
  expect(screen.getByText(en.ticketStatus.noMoves)).toBeInTheDocument();
  expect(screen.queryByLabelText(en.ticketStatus.label)).not.toBeInTheDocument();
});

test('the note is asked for before the API is called, not after a 422', async () => {
  const { stub, patches } = desk(json(TICKET));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'resolved');
  expect(screen.getByLabelText(en.ticketStatus.noteLabel)).toBeInTheDocument();

  await userEvent.click(moveButton());
  await waitFor(() => expect(screen.getByText(en.ticketStatus.noteRequired)).toBeInTheDocument());
  // The requirement is stated, not discovered: nothing was sent.
  expect(patches).toHaveLength(0);
});

test('a note that is only whitespace is refused the way the API refuses it', async () => {
  const { stub, patches } = desk(json(TICKET));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'resolved');
  await userEvent.type(screen.getByLabelText(en.ticketStatus.noteLabel), '   ');
  await userEvent.click(moveButton());

  await waitFor(() => expect(screen.getByText(en.ticketStatus.noteRequired)).toBeInTheDocument());
  expect(screen.getByLabelText(en.ticketStatus.noteLabel)).toHaveAttribute('aria-invalid', 'true');
  expect(patches).toHaveLength(0);
});

test('resolving with a note sends it, and the note is readable afterwards', async () => {
  const resolved = {
    ...TICKET,
    status: 'resolved',
    revision: 2,
    allowedTransitions: ['closed', 'reopened'],
    resolutionNote: 'Replaced the cable.',
  };
  const { stub, patches } = desk(json(resolved));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'resolved');
  await userEvent.type(screen.getByLabelText(en.ticketStatus.noteLabel), 'Replaced the cable.');
  await userEvent.click(moveButton());

  await waitFor(() => expect(patches).toHaveLength(1));
  expect(patches[0]).toEqual({ status: 'resolved', revision: 1, note: 'Replaced the cable.' });

  await waitFor(() =>
    expect(screen.getByText(/Replaced the cable\./)).toBeInTheDocument(),
  );
  // And the row now offers what the RESOLVED ticket allows, not what the new
  // one did.
  await waitFor(() =>
    expect(moves().getByRole('option', { name: en.ticketQueue.statusClosed })).toBeInTheDocument(),
  );
});

test('a move that is not resolving sends no note', async () => {
  const { stub, patches } = desk(json({ ...TICKET, status: 'open', revision: 2 }));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'open');
  // No note field appears, because T-4 names resolving and no other edge.
  expect(screen.queryByLabelText(en.ticketStatus.noteLabel)).not.toBeInTheDocument();

  await userEvent.click(moveButton());
  await waitFor(() => expect(patches).toHaveLength(1));
  expect(patches[0]).toEqual({ status: 'open', revision: 1 });
});

test('a stale revision says the ticket changed rather than blaming the server', async () => {
  const { stub } = desk(json({ code: 'REVISION_MISMATCH', requestId: 'rq' }, 409));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'open');
  await userEvent.click(moveButton());

  await waitFor(() => expect(screen.getByText(en.ticketStale.title)).toBeInTheDocument());
  expect(screen.getByText(en.errors.REVISION_MISMATCH)).toBeInTheDocument();
});

test('a refusal from the machine is reported as itself', async () => {
  // The backstop, doing its job — the screen should not normally be able to
  // reach this, which is why the ticket carries its legal moves.
  const { stub } = desk(json({ code: 'ILLEGAL_TRANSITION', requestId: 'rq', allowed: ['open'] }, 409));
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  await userEvent.selectOptions(picker(), 'open');
  await userEvent.click(moveButton());

  await waitFor(() => expect(screen.getByText(en.ticketStatus.failedTitle)).toBeInTheDocument());
  expect(screen.getByText(en.errors.ILLEGAL_TRANSITION)).toBeInTheDocument();
  expect(screen.queryByText(en.errors.INTERNAL)).not.toBeInTheDocument();
});

test('a ticket from a server too old to send its legal moves offers none', async () => {
  // Not hypothetical: a dev server started before the field existed returned
  // tickets without it, and reading .length straight off undefined blanked the
  // entire page. Defaulted to nothing rather than everything — a screen that
  // cannot verify a move should not offer it.
  const old = { ...TICKET };
  delete (old as { allowedTransitions?: unknown }).allowedTransitions;
  const { stub } = desk(json(TICKET), old as Ticket);
  vi.stubGlobal('fetch', stub);
  renderWithProviders(<TicketQueuePage />);
  await ready();

  expect(screen.getByText(en.ticketStatus.noMoves)).toBeInTheDocument();
  expect(screen.queryByLabelText(en.ticketStatus.label)).not.toBeInTheDocument();
});
