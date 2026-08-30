// Proves scripts/criteria/conversation.md section CONVERSATION-1-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';
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

const MESSAGE = {
  id: 'm-1',
  ticketId: 't-1',
  authorId: 'agent-1',
  kind: 'public',
  body: 'We are looking at it.',
  createdAt: '2026-08-30T10:00:00.000Z',
};

// Everything the queue row loads, plus the reply. Replies are recorded so a
// test can say what was sent rather than counting calls in order.
function desk({ replied = json({ message: MESSAGE, ticket: ticket({ status: 'open', revision: 2 }) }, 201) } = {}) {
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
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
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

const open = async (language?: 'en' | 'ar') => {
  renderWithProviders(<TicketQueuePage />, { signedIn: true, language });
  const t = language === 'ar' ? ar : en;
  return screen.findByLabelText(t.ticketReply.label);
};

test('an agent replies from the row, and the reply is what was sent', async () => {
  const { sent } = desk();
  const box = await open();

  await userEvent.type(box, '  We are looking at it.  ');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));

  await waitFor(() => expect(sent).toHaveLength(1));
  // Trimmed by the screen: the API trims too, so the round trip would come
  // back with the answer it already had.
  // The kind travels with it. The desk chooses, and 'public' is the choice the
  // box opens on — not an absence the API has to interpret.
  expect(sent[0]).toEqual({ body: 'We are looking at it.', kind: 'public' });
});

test('the row follows the ticket the reply changed', async () => {
  desk();
  const box = await open();
  // The row's own summary line, not just the word: "New" is also a filter
  // option and a nav label, and matching those would pass whatever the row
  // said.
  const summary = () => screen.getByText(/·/).textContent ?? '';
  expect(summary()).toMatch(/^New ·/);

  await userEvent.type(box, 'We are looking at it.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));

  // The first public reply opens a `new` ticket, server-side. A row still
  // saying New afterwards is the screen disagreeing with the ticket — and the
  // screen is told rather than working it out, which would be a second place
  // that decides when a ticket opens.
  await waitFor(() => expect(summary()).toMatch(/^Open ·/));
});

test('the box empties on success', async () => {
  desk();
  const box = await open();

  await userEvent.type(box, 'We are looking at it.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));

  await waitFor(() => expect(box).toHaveValue(''));
});

test('a failed reply keeps the draft', async () => {
  desk({ replied: json({ code: 'INTERNAL' }, 500) });
  const box = await open();

  await userEvent.type(box, 'Something I spent a while writing.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));

  expect(await screen.findByText(en.ticketReply.failed)).toBeInTheDocument();
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
  // Losing what somebody typed because the server failed is a second failure
  // on top of the first.
  expect(box).toHaveValue('Something I spent a while writing.');
});

test('a blank reply never reaches the API', async () => {
  const { sent } = desk();
  const box = await open();

  await userEvent.type(box, '   ');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));

  expect(screen.getByRole('alert')).toHaveTextContent(en.ticketReply.required);
  expect(sent).toEqual([]);
  // And typing again clears the mark rather than leaving it standing.
  await userEvent.type(box, 'Now there is something.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a second press while the first is in flight is not a second reply', async () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const { fetch } = desk({ replied: () => pending as unknown as Response });
  const box = await open();

  await userEvent.type(box, 'We are looking at it.');
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));

  const busy = await screen.findByRole('button', { name: en.ticketReply.sending });
  expect(busy).toBeDisabled();
  await userEvent.click(busy, { pointerEventsCheck: 0 });
  const replies = fetch.mock.calls.filter(([i]) => String(i).endsWith('/replies'));
  expect(replies).toHaveLength(1);

  release(json({ message: MESSAGE, ticket: ticket({ status: 'open', revision: 2 }) }, 201)());
  await waitFor(() => expect(box).toHaveValue(''));
});

test('a field the API named is marked, with the shared sentence', async () => {
  desk({ replied: json({ code: 'VALIDATION_FAILED', fields: ['body'] }, 422) });
  const box = await open();

  await userEvent.type(box, 'x'.repeat(20));
  await userEvent.click(screen.getByRole('button', { name: en.ticketReply.send }));

  await waitFor(() => expect(box).toHaveAttribute('aria-invalid', 'true'));
  expect(screen.getByRole('alert')).toHaveTextContent(en.errors.VALIDATION_FAILED);
  expect(screen.queryByText(en.ticketReply.failed)).not.toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  desk();
  const box = await open('ar');

  expect(box).toBeInTheDocument();
  expect(screen.getByRole('button', { name: ar.ticketReply.send })).toBeInTheDocument();
  expect(ar.ticketReply.send).not.toBe(en.ticketReply.send);
});
