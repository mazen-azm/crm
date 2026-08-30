// Proves scripts/criteria/portal.md section PORTAL-3-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ME = { id: 'u-1', role: 'customer', name: 'Aiko Tanaka' };

const ticket = (over = {}) => ({
  id: 't-1',
  customerId: 'c-1',
  subject: 'The invoice is wrong',
  status: 'open',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 1,
  reopenWindowOpen: false,
  allowedTransitions: [],
  resolutionNote: null,
  channel: 'web',
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-08-30T09:00:00.000Z',
  ...over,
});

const mine = {
  id: 'm-1',
  ticketId: 't-1',
  authorId: ME.id,
  kind: 'public',
  body: 'The invoice says three hundred and I paid two.',
  createdAt: '2026-08-30T09:05:00.000Z',
};

const theirs = {
  id: 'm-2',
  ticketId: 't-1',
  authorId: 'agent-7',
  kind: 'public',
  body: 'We are looking at it now.',
  createdAt: '2026-08-30T10:00:00.000Z',
};

function portal({
  one = json(ticket()),
  messages = [mine, theirs],
  replied = json({ message: { ...mine, id: 'm-new', body: 'It is still wrong.' }, ticket: ticket() }, 201),
} = {}) {
  const shownTotal = messages.length;
  const sent: Array<Record<string, unknown>> = [];
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    asked.push(url.pathname + url.search);
    if (url.pathname === '/api/v1/me') return Promise.resolve(json(ME)());
    if (url.pathname.endsWith('/messages')) {
      const offset = Number(url.searchParams.get('offset') ?? 0);
      return Promise.resolve(
        json({ items: messages.slice(offset, offset + 20), total: shownTotal, limit: 20, offset })(),
      );
    }
    if (url.pathname.endsWith('/replies')) {
      if (init?.body) sent.push(JSON.parse(String(init.body)));
      return Promise.resolve(replied());
    }
    if (url.pathname === '/api/v1/tickets/t-1') return Promise.resolve(one());
    throw new Error(`this screen must not call ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, sent, asked };
}

afterEach(() => vi.unstubAllGlobals());

const open = (route = '/portal/tickets/t-1', language?: 'en' | 'ar') =>
  renderWithProviders(<AppRoutes />, { signedIn: true, route, language });

test('a customer opens their own ticket and reads the thread, oldest first', async () => {
  portal();
  open();

  expect(await screen.findByRole('heading', { name: 'The invoice is wrong' })).toBeInTheDocument();
  const bodies = await screen.findAllByText(/invoice says|looking at it/);
  // In the order the API gave them, which is oldest first. Nothing is sorted
  // here: a second sort on the client is a second answer to what order means.
  expect(bodies.map((b) => b.textContent)).toEqual([mine.body, theirs.body]);
});

test('the two sides are told apart without a badge that reads as a status', async () => {
  portal();
  open();

  await screen.findByText(mine.body);
  expect(screen.getByText(en.portalTicket.fromYou)).toBeInTheDocument();
  expect(screen.getByText(en.portalTicket.fromSupport)).toBeInTheDocument();

  // And drawn on different sides, so the difference survives somebody scanning
  // it. "Agent" or "Customer" beside a reply would read as a status the reader
  // has been given, which is not what it means.
  const rows = document.querySelectorAll('.portal-thread__message');
  expect(rows).toHaveLength(2);
  expect(rows[0].className).toContain('portal-thread__message--mine');
  expect(rows[1].className).not.toContain('portal-thread__message--mine');
});

test('whose message it is comes from who is signed in, not from the ticket', async () => {
  // The ticket's customerId is a CUSTOMER id; a message's author is a USER id.
  // They are two rows joined by customers.user_id. A screen comparing them
  // would mark every message as somebody else's, and the mistake would look
  // like a styling bug.
  portal({ one: json(ticket({ customerId: 'c-1' })) });
  open();

  await screen.findByText(mine.body);
  const rows = document.querySelectorAll('.portal-thread__message');
  expect(rows[0].className).toContain('--mine');
});

test('somebody else’s ticket looks exactly like one that is not there', async () => {
  portal({ one: json({ code: 'NOT_FOUND', requestId: 'r-1' }, 404) });
  open();

  expect(await screen.findByText(en.portalTicket.notFoundTitle)).toBeInTheDocument();
  // Nothing on the screen distinguishes the two, because nothing in the answer
  // does: the API gives one 404 for both, and a screen that told them apart
  // would confirm to a stranger that their guess had found a real ticket.
  expect(screen.queryByText(/not yours|permission|forbidden/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(en.portalTicket.replyLabel)).not.toBeInTheDocument();
});

test('a resolved ticket inside the window says replying will reopen it, before the box', async () => {
  portal({ one: json(ticket({ status: 'resolved', reopenWindowOpen: true })) });
  open();

  const warning = await screen.findByText(en.portalTicket.replyReopens);
  const box = screen.getByLabelText(en.portalTicket.replyLabel);
  // Before, in the document, not beside the button. Somebody who learns their
  // reply reopened the ticket only after it has reads a status they did not
  // ask for as a fault.
  expect(warning.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('outside the window there is no warning, and the box is still there', async () => {
  portal({ one: json(ticket({ status: 'resolved', reopenWindowOpen: false })) });
  open();

  await screen.findByRole('heading', { name: 'The invoice is wrong' });
  // No warning: replying will not reopen it, so saying so would be a promise
  // the API refuses. The box stays — whether a reply is accepted is the API's
  // answer, and a screen that hid the box would be deciding it here.
  expect(screen.queryByText(en.portalTicket.replyReopens)).not.toBeInTheDocument();
  expect(screen.getByLabelText(en.portalTicket.replyLabel)).toBeInTheDocument();
});

test('a reply is sent, appears, and the ticket is read again', async () => {
  const { sent, asked } = portal({
    one: json(ticket({ status: 'resolved', reopenWindowOpen: true })),
  });
  open();

  const box = await screen.findByLabelText(en.portalTicket.replyLabel);
  await userEvent.type(box, '  It is still wrong.  ');
  await userEvent.click(screen.getByRole('button', { name: en.portalTicket.send }));

  await waitFor(() => expect(sent).toHaveLength(1));
  // Trimmed, and the kind named rather than left for the API to assume.
  expect(sent[0]).toEqual({ body: 'It is still wrong.', kind: 'public' });
  await waitFor(() => expect(screen.getByText('It is still wrong.')).toBeInTheDocument());
  await waitFor(() => expect(box).toHaveValue(''));

  // And the ticket is read again: a reply inside the window reopens it, and a
  // screen still saying Resolved afterwards is the screen disagreeing with the
  // ticket it just changed.
  expect(asked.filter((p) => p === '/api/v1/tickets/t-1').length).toBeGreaterThan(1);
});

test('a blank reply never reaches the API', async () => {
  const { sent } = portal();
  open();

  const box = await screen.findByLabelText(en.portalTicket.replyLabel);
  await userEvent.type(box, '   ');
  await userEvent.click(screen.getByRole('button', { name: en.portalTicket.send }));

  expect(screen.getByRole('alert')).toHaveTextContent(en.portalTicket.replyRequired);
  expect(sent).toEqual([]);
});

test('the reply box lets the API own its rules', async () => {
  portal();
  open();

  const box = await screen.findByLabelText(en.portalTicket.replyLabel);
  // No native validator. The browser refusing to submit means the API's rule
  // never runs and the sentence somebody reads is the browser's — wrong
  // language, unstyled, outside the resource files (L-55).
  for (const attribute of ['required', 'minlength', 'maxlength', 'pattern']) {
    expect(box).not.toHaveAttribute(attribute);
  }
});

test('the screen filters nothing — it renders what it was given', async () => {
  // A customer is never sent an internal note: the API decides that, and a
  // census drives every route to prove it (SC-2). If this ever renders one,
  // the API sent something it should not have — which is what the assertion is
  // for. A test asserting the screen HID it would be pinning the wrong layer.
  portal({ messages: [mine, { ...theirs, kind: 'internal', body: 'Do not promise a date.' }] });
  open();

  await screen.findByText(mine.body);
  expect(document.querySelectorAll('.portal-thread__message')).toHaveLength(2);
  expect(screen.getByText('Do not promise a date.')).toBeInTheDocument();
});

test('a long thread pages with the API’s window and lands on the newest', async () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    ...theirs,
    id: `m-${String(i).padStart(3, '0')}`,
    body: `Message ${i}`,
    createdAt: `2026-08-30T10:${String(i).padStart(2, '0')}:00.000Z`,
  }));
  const { asked } = portal({ messages: many });
  open();

  await waitFor(() => expect(screen.getByText('Message 39')).toBeInTheDocument());
  expect(screen.queryByText('Message 0')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: en.ticketThread.older }));
  await waitFor(() => expect(screen.getByText('Message 0')).toBeInTheDocument());

  // No limit of the screen's own on any request: the window is the API's
  // (BR-4), the same as the desk's thread and the tickets list.
  expect(asked.filter((p) => p.includes('limit=')).length).toBe(0);
});

test('an empty thread says so rather than showing a blank pane', async () => {
  portal({ messages: [] });
  open();

  expect(await screen.findByText(en.portalTicket.emptyTitle)).toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  portal({ one: json(ticket({ status: 'resolved', reopenWindowOpen: true })) });
  open('/portal/tickets/t-1', 'ar');

  expect(await screen.findByText(ar.portalTicket.replyReopens)).toBeInTheDocument();
  // The thread arrives after the ticket does — two requests, and the second
  // is what carries the words this asserts.
  expect(await screen.findByText(ar.portalTicket.fromYou)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: ar.portalTicket.send })).toBeInTheDocument();
  expect(ar.portalTicket.fromSupport).not.toBe(en.portalTicket.fromSupport);
});
