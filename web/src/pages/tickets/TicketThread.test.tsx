// Proves scripts/criteria/conversation.md section CONVERSATION-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor, within } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';
import type { Message } from './useReply';
import { ar } from '../../shared/i18n/ar';

// The API's own default window. The screen never sends one, so this is what a
// page is unless a test says otherwise.
const PAGE = 20;

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ticket = (over = {}) => ({
  id: 't-1',
  customerId: 'c-1',
  subject: 'The invoice is wrong',
  status: 'new',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 1,
  reopenWindowOpen: false,
  breaches: [],
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
  // Every window the screen asked for, in order — so a test can say what was
  // requested rather than inferring it from what was rendered.
  const asked: Array<{ offset: number; limit: string | null }> = [];
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
      if (thread) return Promise.resolve(thread());
      // A real window over the fixture, so a paging test asks the stub the
      // same question the screen asks the server. A stub that answered the
      // whole list whatever was asked would pass a screen that paged wrongly.
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? PAGE);
      asked.push({ offset, limit: url.searchParams.get('limit') });
      return Promise.resolve(
        json({
          items: messages.slice(offset, offset + limit),
          total: shownTotal,
          limit,
          offset,
        })(),
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
  return { fetch, sent, asked };
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

// A thread longer than one page: forty messages, numbered so a test can say
// which page it is looking at.
const longThread = (n = 40): Message[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m-${String(i).padStart(3, '0')}`,
    ticketId: 't-1',
    authorId: 'agent-1',
    kind: i % 2 === 1 ? 'internal' : 'public',
    body: `Message ${i}`,
    createdAt: `2026-08-30T10:${String(i).padStart(2, '0')}:00.000Z`,
  }));

test('a long thread opens on the newest messages, and says that is where it is', async () => {
  const { asked } = desk({ messages: longThread() });
  await openThread();

  // Forty messages, twenty to a page: the last page starts at twenty.
  await waitFor(() => expect(screen.getByText('Message 39')).toBeInTheDocument());
  expect(screen.queryByText('Message 0')).not.toBeInTheDocument();
  expect(rows()).toHaveLength(20);

  // And it says so. A screen that silently opened in the middle of a thread
  // would read as a fault, the same way an unexplained status change does.
  expect(screen.getByText(/newest messages/i)).toHaveTextContent('21');
  expect(screen.getByText(/newest messages/i)).toHaveTextContent('40');

  // Two requests to get there: the first to learn the total, the second for
  // the page it named. There is no shortcut to the last page and the total is
  // not knowable before the first answer.
  expect(asked.map((a) => a.offset)).toEqual([0, 20]);
});

test('“older messages” loads older messages', async () => {
  const { asked } = desk({ messages: longThread() });
  await openThread();
  await waitFor(() => expect(screen.getByText('Message 39')).toBeInTheDocument());

  await userEvent.click(screen.getByRole('button', { name: en.ticketThread.older }));

  // The defect this story exists to fix: the button used to read
  // "Show older messages" and fetch `offset = messages.length`, which in an
  // oldest-first thread is the NEWER page. It did the opposite of what it said,
  // and the test that covered it asserted only that a page arrived.
  await waitFor(() => expect(screen.getByText('Message 0')).toBeInTheDocument());
  expect(screen.queryByText('Message 39')).not.toBeInTheDocument();
  expect(asked.at(-1)?.offset).toBe(0);
});

test('the ends are ends: no older on the first page, no newer on the last', async () => {
  desk({ messages: longThread() });
  await openThread();
  await waitFor(() => expect(screen.getByText('Message 39')).toBeInTheDocument());

  const older = () => screen.getByRole('button', { name: en.ticketThread.older });
  const newer = () => screen.getByRole('button', { name: en.ticketThread.newer });
  expect(newer()).toBeDisabled();
  expect(older()).toBeEnabled();

  await userEvent.click(older());
  await waitFor(() => expect(screen.getByText('Message 0')).toBeInTheDocument());
  expect(older()).toBeDisabled();
  expect(newer()).toBeEnabled();
});

test('the screen names no page size; it steps by the one the answer reported', async () => {
  const { asked } = desk({ messages: longThread(40) });
  await openThread();
  await waitFor(() => expect(screen.getByText('Message 39')).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: en.ticketThread.older }));
  await waitFor(() => expect(screen.getByText('Message 0')).toBeInTheDocument());

  // Not one request carries a limit. The window is the API's (BR-4), and a
  // screen that sent its own would be a second answer to how big a page is —
  // one that goes wrong quietly the day the server changes its mind.
  expect(asked.every((a) => a.limit === null)).toBe(true);
});

test('a thread that fits one page has no pager to read', async () => {
  desk({ messages: longThread(3) });
  await openThread();

  await waitFor(() => expect(rows()).toHaveLength(3));
  // Controls for a journey of one step are noise, and a status line saying
  // "1 to 3 of 3" tells a reader nothing they cannot see.
  expect(screen.queryByRole('button', { name: en.ticketThread.older })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: en.ticketThread.newer })).not.toBeInTheDocument();
});

test('a reply appears at the newest end, and not on an older page', async () => {
  desk({
    messages: longThread(40),
    replied: json({ message: CUSTOMER_MESSAGE, ticket: ticket() }, 201),
  });
  renderWithProviders(<TicketQueuePage />, { signedIn: true });

  const box = await screen.findByLabelText(en.ticketReply.label);
  await userEvent.type(box, 'It is still happening.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));
  await waitFor(() => expect(box).toHaveValue(''));

  await userEvent.click(screen.getByRole('button', { name: en.ticketThread.show }));
  await waitFor(() => expect(screen.getByText(CUSTOMER_MESSAGE.body)).toBeInTheDocument());

  // Then page back. The message belongs at the newest end, so putting it on
  // page one would put it somewhere it is not.
  await userEvent.click(screen.getByRole('button', { name: en.ticketThread.older }));
  await waitFor(() => expect(screen.getByText('Message 0')).toBeInTheDocument());
  expect(screen.queryByText(CUSTOMER_MESSAGE.body)).not.toBeInTheDocument();
});

test('the pager sentence is a whole sentence per language, with the numbers isolated', async () => {
  desk({ messages: longThread() });
  await openThread('ar');

  await waitFor(() => expect(screen.getByText('Message 39')).toBeInTheDocument());
  const line = screen.getByText(/أحدث الرسائل/);
  // Every substituted number carries a first-strong isolate. Without it the
  // bidi algorithm takes the punctuation after a numeral as part of that
  // left-to-right run and moves it (L-51).
  expect(line.textContent).toContain('\u2068');
  expect(line.textContent).toContain('\u2069');
  expect(ar.ticketThread.showingNewest).not.toBe(en.ticketThread.showingNewest);
});
