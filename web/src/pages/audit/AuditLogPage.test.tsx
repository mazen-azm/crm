// Proves scripts/criteria/audit.md section AUDIT-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const STAFF = [
  { id: 'staff-1', name: 'Sofia Martinez', role: 'agent' },
  { id: 'staff-2', name: 'Kenji Watanabe', role: 'admin' },
];

const ROW = (over = {}) => ({
  id: 'a-1',
  actorId: 'staff-1',
  entity: 'ticket',
  entityId: 't-1',
  verb: 'ticket.create',
  at: '2026-08-30T09:00:00.000Z',
  before: null,
  after: null,
  ...over,
});

function desk({ role = 'admin', page = null as null | (() => Response), rows = [ROW()] } = {}) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'staff-2', role, name: 'Kenji Watanabe' })());
    }
    if (url.pathname.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: STAFF, total: STAFF.length, limit: 100, offset: 0 })());
    }
    if (url.pathname === '/api/v1/audit-events') {
      asked.push(url.search);
      return Promise.resolve((page ?? json({ items: rows, total: rows.length, limit: 20, offset: 0 }))());
    }
    throw new Error(`this screen must not call ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

afterEach(() => vi.unstubAllGlobals());

const open = (route = '/audit', language?: 'en' | 'ar') =>
  renderWithProviders(<AppRoutes />, { signedIn: true, route, language });

test('an admin reads the trail, one sentence per row', async () => {
  desk({
    rows: [
      ROW(),
      ROW({ id: 'a-2', verb: 'customer.update', entity: 'customer', entityId: 'c-1', after: { name: 'Aiko Tanaka' } }),
      ROW({ id: 'a-3', verb: 'user.disable', entity: 'user', entityId: 'u-9' }),
    ],
  });
  open();

  // Every row is a sentence, from the one module the ticket history uses. A
  // screen with its own mapping would be a second place deciding what a verb
  // means.
  expect(await screen.findByText(/raised this ticket/)).toBeInTheDocument();
  expect(screen.getByText(/corrected/)).toHaveTextContent('Aiko Tanaka');
  expect(screen.getByText(/disabled this account/)).toBeInTheDocument();
  // And none of them falls back to naming the verb.
  expect(screen.queryByText(/recorded as/)).not.toBeInTheDocument();
});

test('the filters go into the address, so the view can be sent to somebody', async () => {
  const { asked } = desk();
  open();
  await screen.findByText(/raised this ticket/);

  await userEvent.selectOptions(screen.getByLabelText(en.auditLog.actorLabel), 'staff-1');

  await waitFor(() => expect(asked.at(-1)).toContain('actorId=staff-1'));

  // And the address is the source of that, not a copy of it: opening the app
  // AT that address asks the same question without anybody touching a control.
  // (The harness routes in memory, so `window.location` is not where to look.)
  vi.unstubAllGlobals();
  const fresh = desk();
  open('/audit?actorId=staff-1');
  await waitFor(() => expect(fresh.asked.at(-1)).toContain('actorId=staff-1'));
});

test('the system is a choice, because those are the rows nobody can explain', async () => {
  const { asked } = desk({ rows: [ROW({ actorId: null, verb: 'ticket.status', before: { status: 'resolved' }, after: { status: 'closed' } })] });
  open();
  await screen.findByLabelText(en.auditLog.actorLabel);

  await userEvent.selectOptions(screen.getByLabelText(en.auditLog.actorLabel), 'system');

  // The API's own sentinel. An admin cannot ask a colleague about an
  // auto-close, and a filter that could only name people would hide it.
  await waitFor(() => expect(asked.at(-1)).toContain('actorId=system'));
  // And the row reads as the system rather than as a blank name — inside the
  // list, not counting the picker's own option, which says the same word.
  await waitFor(() =>
    expect(document.querySelector('.audit-log__entry')?.textContent)
      .toContain(en.ticketHistory.systemActor),
  );
});

test('the id box appears only once a thing is chosen', async () => {
  desk();
  open();
  await screen.findByLabelText(en.auditLog.entityLabel);

  // The API refuses an id with no entity beside it. Offering the box first
  // invites the refusal.
  expect(screen.queryByLabelText(en.auditLog.entityIdLabel)).not.toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText(en.auditLog.entityLabel), 'ticket');
  expect(await screen.findByLabelText(en.auditLog.entityIdLabel)).toBeInTheDocument();
});

test('choosing a different thing forgets which one', async () => {
  const { asked } = desk();
  open('/audit?entity=ticket&entityId=t-1');
  await screen.findByText(/raised this ticket/);

  await userEvent.selectOptions(screen.getByLabelText(en.auditLog.entityLabel), 'customer');

  // An id from the last thing is an id that matches nothing, and the API
  // refuses it. Clearing it is the screen not building a request it knows is
  // wrong.
  await waitFor(() => expect(asked.at(-1)).not.toContain('entityId'));
  expect(asked.at(-1)).toContain('entity=customer');
});

test('a date range covers the whole of the day somebody chose', async () => {
  const { asked } = desk();
  open();
  await screen.findByLabelText(en.auditLog.toLabel);

  await userEvent.type(screen.getByLabelText(en.auditLog.toLabel), '2026-08-30');

  // A bound at midnight would exclude everything that happened on the day
  // somebody asked for, which is not what "to" means to a reader.
  await waitFor(() => expect(asked.at(-1)).toContain('T23%3A59%3A59.999Z'));
});

test('changing a filter starts again from the first page', async () => {
  const { asked } = desk({ page: json({ items: [ROW()], total: 50, limit: 20, offset: 20 }) });
  open('/audit?offset=20');
  await screen.findByText(/raised this ticket/);

  await userEvent.selectOptions(screen.getByLabelText(en.auditLog.actorLabel), 'staff-1');

  // Keeping the offset would show page two of a search that may have one.
  await waitFor(() => expect(asked.at(-1)).not.toContain('offset'));
});

test('a non-admin is told, rather than shown a screen that will refuse them', async () => {
  const { asked } = desk({ role: 'agent' });
  open();

  expect(await screen.findByText(en.auditLog.adminOnlyTitle)).toBeInTheDocument();
  expect(screen.queryByLabelText(en.auditLog.actorLabel)).not.toBeInTheDocument();
  // Courtesy, not enforcement — and it does not ask for what it may not have.
  expect(asked).toEqual([]);
});

test('nothing matching says so', async () => {
  desk({ rows: [] });
  open();

  expect(await screen.findByText(en.auditLog.emptyTitle)).toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  desk();
  open('/audit', 'ar');

  expect(await screen.findByRole('heading', { name: ar.auditLog.title })).toBeInTheDocument();
  expect(screen.getByLabelText(ar.auditLog.actorLabel)).toBeInTheDocument();
  expect(ar.auditLog.title).not.toBe(en.auditLog.title);
});
