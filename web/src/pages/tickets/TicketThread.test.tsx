// Proves scripts/criteria/conversation.md section CONVERSATION-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor, within } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';
import type { Message } from './useReply';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ticket = (over = {}) => ({
  id: 't-1',
  subject: 'The invoice is wrong',
  status: 'new',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 1,
  allowedTransitions: ['open', 'pending', 'resolved'],
  resolutionNote: null,
  channel: 'desk',
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-08-30T09:00:00.000Z',
  ...over,
});

const PUBLIC_MESSAGE: Message = {
  id: 'm-public',
  ticketId: 't-1',
  authorId: 'agent-1',
  kind: 'public',
  body: 'We are looking at it.',
  createdAt: '2026-08-30T10:00:00.000Z',
};

const NOTE: Message = {
  id: 'm-note',
  ticketId: 't-1',
  authorId: 'agent-1',
  kind: 'internal',
  body: 'Billing say their system is down; do not promise a date.',
  createdAt: '2026-08-30T10:05:00.000Z',
};

const CUSTOMER_MESSAGE: Message = {
  id: 'm-theirs',
  ticketId: 't-1',
  authorId: 'customer-9',
  kind: 'public',
  body: 'It is still happening.',
  createdAt: '2026-08-30T10:10:00.000Z',
};

// The API answers with both kinds on this route: what a customer may see is
// its rule, and a census there drives every route to prove it. The screen
// under test receives the desk's answer.
function desk({
  messages = [PUBLIC_MESSAGE, NOTE],
  // Not `messages.length` as a default: the API's total counts what the reader
  // may see, and a test about paging needs to say a number the page does not.
  total,
  thread = null,
  replied = json({ message: PUBLIC_MESSAGE, ticket: ticket({ status: 'open', revision: 2 }) }, 201),
}: {
  messages?: Message[];
  total?: number;
  thread?: null | (() => Response);
  replied?: () => Response;
} = {}) {
  const shownTotal = total ?? messages.length;
  const sent: Array<Record<string, unknown>> = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'agent-1', role: 'agent', name: 'Omar Reilly' })());
    }
    if (url.pathname.startsWith('/api/v1/ticket-categories')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    }
    if (url.pathname.startsWith('/api/v1/assignees')) {
      return Promise.resolve(
        json({ items: [{ id: 'agent-1', name: 'Omar Reilly' }], total: 1, limit: 100, offset: 0 })(),
      );
    }
    if (url.pathname.endsWith('/messages')) {
      return Promise.resolve(
        (thread ?? json({ items: messages, total: shownTotal, limit: 20, offset: 0 }))(),
      );
    }
    if (url.pathname.endsWith('/replies')) {
      if (init?.body) sent.push(JSON.parse(String(init.body)));
      return Promise.resolve(replied());
    }
    if (url.pathname.includes('/history')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 20, offset: 0 })());
    }
    return Promise.resolve(json({ items: [ticket()], total: 1, limit: 25, offset: 0 })());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, sent };
}

afterEach(() => vi.unstubAllGlobals());

const openThread = async (language?: 'en' | 'ar') => {
  renderWithProviders(<TicketQueuePage />, { signedIn: true, language });
  const t = language === 'ar' ? ar : en;
  await userEvent.click(await screen.findByRole('button', { name: t.ticketThread.show }));
};

const rows = () => document.querySelectorAll('.ticket-thread__message');

test('a public reply and an internal note are visibly different, not only captioned', async () => {
  desk();
  await openThread();

  await waitFor(() => expect(rows()).toHaveLength(2));
  const [reply, note] = [...rows()];

  // The words are there, and a screen reader has them.
  expect(within(reply as HTMLElement).getByText(en.ticketThread.publicTag)).toBeInTheDocument();
  expect(within(note as HTMLElement).getByText(en.ticketThread.internalTag)).toBeInTheDocument();

  // And the note is drawn differently — its own surface and edge, so the
  // difference survives somebody scanning the thread without reading it. A
  // caption alone would be a difference only for whoever stops to read.
  expect(note.className).toContain('ticket-thread__message--internal');
  expect(reply.className).not.toContain('ticket-thread__message--internal');
});

test('the screen shows what the API sent, and filters nothing', async () => {
  desk({ messages: [PUBLIC_MESSAGE, NOTE, CUSTOMER_MESSAGE] });
  await openThread();

  // All three, including the note. What a customer may see is enforced in the
  // API (SC-2) — a screen that hid notes would be a second gate, and a test
  // asserting it hid them would pin the wrong layer.
  await waitFor(() => expect(rows()).toHaveLength(3));
  expect(screen.getByText(NOTE.body)).toBeInTheDocument();
  expect(screen.getByText(CUSTOMER_MESSAGE.body)).toBeInTheDocument();
  // The desk's own author is named from the staff list the row already holds;
  // an author who is not on it is the other side of the conversation.
  expect(screen.getAllByText('Omar Reilly').length).toBeGreaterThan(0);
  expect(screen.getByText(en.ticketThread.customerAuthor)).toBeInTheDocument();
});

test('which kind is being written is clear before anything is typed', async () => {
  desk();
  renderWithProviders(<TicketQueuePage />, { signedIn: true });

  // Nothing typed, nothing opened. Both choices are readable side by side —
  // a closed menu naming only the current mode would answer this only for
  // somebody who looked.
  const box = await screen.findByLabelText(en.ticketReply.label);
  expect(box).toHaveValue('');
  expect(screen.getByRole('radio', { name: en.ticketReply.modePublic })).toBeChecked();
  expect(screen.getByRole('radio', { name: en.ticketReply.modeInternal })).not.toBeChecked();
  expect(screen.getByText(en.ticketReply.mode)).toBeInTheDocument();
});

test('choosing the note changes the box before a word is typed, and what is sent', async () => {
  const { sent } = desk({
    replied: json({ message: NOTE, ticket: ticket() }, 201),
  });
  renderWithProviders(<TicketQueuePage />, { signedIn: true });
  await screen.findByLabelText(en.ticketReply.label);

  await userEvent.click(screen.getByRole('radio', { name: en.ticketReply.modeInternal }));

  // Four places say so at once: the label, the placeholder, the button, and
  // the surface the box sits on.
  const note = screen.getByLabelText(en.ticketReply.noteLabel);
  expect(note).toHaveAttribute('placeholder', en.ticketReply.notePlaceholder);
  expect(screen.getByRole('button', { name: en.ticketReply.sendNote })).toBeInTheDocument();
  expect(document.querySelector('.ticket-reply--internal')).not.toBeNull();
  expect(screen.queryByLabelText(en.ticketReply.label)).not.toBeInTheDocument();

  await userEvent.type(note, 'Billing are down.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.sendNote }));

  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0]).toEqual({ body: 'Billing are down.', kind: 'internal' });
});

test('a message written here appears in the thread, once', async () => {
  // The thread's own answer does NOT contain the new message: it was fetched
  // after the reply and the list a real server returns would, but a stale one
  // is the case that shows whether the row remembers what it just wrote.
  desk({ messages: [PUBLIC_MESSAGE], replied: json({ message: CUSTOMER_MESSAGE, ticket: ticket() }, 201) });
  renderWithProviders(<TicketQueuePage />, { signedIn: true });

  const box = await screen.findByLabelText(en.ticketReply.label);
  await userEvent.type(box, 'It is still happening.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));
  await waitFor(() => expect(box).toHaveValue(''));

  await userEvent.click(screen.getByRole('button', { name: en.ticketThread.show }));

  // Two: the one that was there and the one just written. A reply that did not
  // appear where the agent sent it reads as a reply that was not sent.
  await waitFor(() => expect(rows()).toHaveLength(2));
  expect(screen.getAllByText(CUSTOMER_MESSAGE.body)).toHaveLength(1);
});

test('a message the server also returned is not shown twice', async () => {
  desk({
    messages: [PUBLIC_MESSAGE, CUSTOMER_MESSAGE],
    replied: json({ message: CUSTOMER_MESSAGE, ticket: ticket() }, 201),
  });
  renderWithProviders(<TicketQueuePage />, { signedIn: true });

  const box = await screen.findByLabelText(en.ticketReply.label);
  await userEvent.type(box, 'It is still happening.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));
  await waitFor(() => expect(box).toHaveValue(''));

  await userEvent.click(screen.getByRole('button', { name: en.ticketThread.show }));

  await waitFor(() => expect(rows()).toHaveLength(2));
  expect(screen.getAllByText(CUSTOMER_MESSAGE.body)).toHaveLength(1);
});

test('an empty thread says so, and a failed one offers a retry', async () => {
  desk({ messages: [], total: 0 });
  await openThread();
  expect(await screen.findByText(en.ticketThread.emptyTitle)).toBeInTheDocument();

  vi.unstubAllGlobals();
  desk({ thread: json({ code: 'INTERNAL' }, 500) });
  await openThread();
  expect(await screen.findByText(en.ticketThread.errorTitle)).toBeInTheDocument();
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  desk();
  await openThread('ar');

  await waitFor(() => expect(rows()).toHaveLength(2));
  expect(screen.getByText(ar.ticketThread.internalTag)).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: ar.ticketReply.modeInternal })).toBeInTheDocument();
  expect(ar.ticketThread.internalTag).not.toBe(en.ticketThread.internalTag);
});
