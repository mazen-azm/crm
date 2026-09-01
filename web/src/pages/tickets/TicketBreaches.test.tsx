// Proves scripts/criteria/service-levels.md section SERVICE-LEVELS-3-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderWithProviders, screen, waitFor } from '../../testing/render';
import { TicketQueuePage } from './TicketQueuePage';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';
import type { Ticket } from './useTicketQueue';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TICKET = (over: Partial<Ticket> = {}): Ticket => ({
  id: 't-1',
  customerId: 'c-1',
  subject: 'Subject t-1',
  status: 'new',
  priority: 'normal',
  assigneeId: null,
  categoryId: null,
  revision: 1,
  reopenWindowOpen: false,
  breaches: [],
  allowedTransitions: ['open', 'pending', 'resolved'],
  resolutionNote: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

const desk = (ticket = TICKET()) => {
  const stub = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'agent-1', role: 'agent', name: 'Omar Reilly' })());
    }
    if (url.pathname.startsWith('/api/v1/ticket-categories') || url.pathname.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    }
    return Promise.resolve(json({ items: [ticket], total: 1, limit: 25, offset: 0 })());
  });
  vi.stubGlobal('fetch', stub);
  return { stub };
};

afterEach(() => vi.unstubAllGlobals());

const marks = () => [...document.querySelectorAll('.ticket-breaches__mark')];

async function ready(ticket = TICKET(), language?: 'en' | 'ar') {
  desk(ticket);
  renderWithProviders(<TicketQueuePage />, { language });
  await waitFor(() => expect(screen.getByText(ticket.subject)).toBeInTheDocument());
}

test('a ticket with a recorded breach says so on the row', async () => {
  await ready(TICKET({ breaches: [{ kind: 'first_response', breachedAt: '2026-08-02T09:00:00.000Z' }] }));

  expect(screen.getByText(en.ticketBreach.firstResponse)).toBeInTheDocument();
  expect(marks()).toHaveLength(1);
});

test('the two kinds are drawn differently, not only captioned differently', async () => {
  await ready(TICKET({
    breaches: [
      { kind: 'first_response', breachedAt: '2026-08-02T09:00:00.000Z' },
      { kind: 'resolution', breachedAt: '2026-08-05T09:00:00.000Z' },
    ],
  }));

  // Two promises, and an agent's next action differs: a missed first response
  // means nobody has spoken to this customer, a missed resolution means
  // somebody has and it is not finished. A single mark would flatten that.
  expect(screen.getByText(en.ticketBreach.firstResponse)).toBeInTheDocument();
  expect(screen.getByText(en.ticketBreach.resolution)).toBeInTheDocument();
  const [first, second] = marks();
  expect(first.className).toContain('--first_response');
  expect(second.className).toContain('--resolution');
  expect(first.className).not.toBe(second.className);
});

test('a ticket with no breach claims none', async () => {
  await ready();

  // The row draws what it was given. A screen that worked lateness out would
  // be a second answer to what late means — and would disagree with the sweep
  // the moment a pause was involved.
  expect(marks()).toEqual([]);
  expect(screen.queryByText(en.ticketBreach.firstResponse)).not.toBeInTheDocument();
});

test('the screen computes no deadline of its own', async () => {
  // A ticket raised long ago with NO breach recorded. If the row worked it out
  // from the dates it holds, it would say this one is late; the API says it is
  // not, and the API is the only thing that knows about pauses and stopped
  // clocks.
  await ready(TICKET({ createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' }));

  expect(marks()).toEqual([]);
});

test('the time it was missed is in the reader’s locale', async () => {
  await ready(TICKET({ breaches: [{ kind: 'resolution', breachedAt: '2026-08-05T09:00:00.000Z' }] }));

  // Not the raw stamp. BR-3: the trail is read by whoever is on the phone.
  expect(screen.queryByText(/2026-08-05T09:00:00.000Z/)).not.toBeInTheDocument();
  expect(screen.getByText(new RegExp(en.ticketBreach.missedAt))).toBeInTheDocument();
});

test('a ticket missing the field entirely does not break the row', async () => {
  // An API older than this story sends no `breaches`. A row that read
  // `.length` off it would blank the whole queue — which has happened here
  // before, with allowedTransitions.
  const { breaches, ...withoutBreaches } = TICKET();
  void breaches;
  await ready(withoutBreaches as Ticket);

  expect(screen.getByText('Subject t-1')).toBeInTheDocument();
  expect(marks()).toEqual([]);
});

test('the two marks are drawn differently, and the stylesheet is where that lives', () => {
  // jsdom applies no stylesheet, so a component test can see the class names
  // and nothing else — a mutation making both edges identical passed every
  // test above. The rule lives in CSS, so this reads the CSS, the way
  // no-mirrored-styles.test.ts already does for the direction rules.
  //
  // What it asserts is that the two modifiers say something DIFFERENT. Which
  // difference is a design decision that may change; that there is one is the
  // criterion — "visibly different, and the difference is not only a word
  // somebody has to read".
  const css = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'TicketBreaches.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, ' ');

  const body = (modifier: string) => {
    const at = css.indexOf(`.ticket-breaches__mark--${modifier}`);
    expect(at, `no rule for ${modifier}`).toBeGreaterThan(-1);
    return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at)).trim();
  };

  const first = body('first_response');
  const resolution = body('resolution');
  expect(first).not.toBe('');
  expect(resolution).not.toBe('');
  expect(first).not.toBe(resolution);
});

test('every string comes from the resource file, in both languages', async () => {
  await ready(TICKET({ breaches: [{ kind: 'first_response', breachedAt: '2026-08-02T09:00:00.000Z' }] }), 'ar');

  expect(await screen.findByText(ar.ticketBreach.firstResponse)).toBeInTheDocument();
  expect(ar.ticketBreach.firstResponse).not.toBe(en.ticketBreach.firstResponse);
});
