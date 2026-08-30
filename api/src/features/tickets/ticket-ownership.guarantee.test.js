// A customer may act only on their own ticket, on every path.
//
// The third acceptance criterion is why this file exists rather than three
// assertions inside the route tests: ownership enforced route by route lapses
// the first time somebody adds a route. So the set of routes checked is READ
// OFF THE ROUTER. A new `/tickets/:id/*` route either refuses a customer or
// fails this census; nobody has to remember.
//
// It is the same shape as audit.guarantee.test.js, for the same reason, and it
// carries the same warning: naming a route in the covered set without driving
// it satisfies the census with a claim, which is the failure a census exists
// to prevent arriving through its own front door.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { createApp } from '../../app.js';
import { ticketsRouter } from './index.js';
import { conversationRouter, createConversationService } from '../conversation/index.js';
import { createTicketsService } from './index.js';
import { createServiceLevels } from '../service-levels/index.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { collectRoutes } from '../../platform/http/route-table.js';
import { API_V1_PREFIX } from '../../platform/http/prefix.js';

const SECRET = 'ownership-census-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// Every route under /tickets/:id. Written as a matcher rather than a list,
// because a list is the thing that goes stale.
const UNDER_A_TICKET = /^[A-Z]+ \/api\/v1\/tickets\/:id(\/|$)/;

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);

  const app = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 });

  // A subject whose role is customer. No customer can hold a real token today
  // — sign-in reads `users` and nothing links a user to a customer — so the
  // subject is supplied by a resolver of this test's own. That is the point:
  // the guard has to exist BEFORE the first customer can sign in, or it
  // arrives after the hole.
  //
  // composeApp builds the real resolver and takes no override, so this mounts
  // the tickets router directly. The census reads its routes off THIS app,
  // which is the tickets router — exactly the surface the rule governs.
  const asCustomer = createApp({
    subjectResolver: async () => ({ id: 'customer-subject', role: 'customer', name: 'A Customer' }),
    mountFeatures: (v1) => {
      const now = () => 1_800_000_000;
      v1.use(ticketsRouter({ db, now }));
      // Conversation serves routes under /tickets/:id too, and the rule is
      // about the path rather than about which feature happens to serve it.
      // Mounting only the tickets router here would make the census blind to
      // exactly the kind of route it exists to catch.
      const tickets = createTicketsService({ db, now });
      v1.use(conversationRouter({
        conversation: createConversationService({
          db, tickets, serviceLevels: createServiceLevels({ db, now }), now,
        }),
      }));
    },
  });

  const server = app.listen(0);
  const customerServer = asCustomer.listen(0);
  servers.push(server, customerServer);

  const url = `http://127.0.0.1:${server.address().port}`;
  const customerUrl = `http://127.0.0.1:${customerServer.address().port}`;

  const token = (await (await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })).json()).token;

  const asStaff = (path, init = {}) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });

  const asTheCustomer = (path, init = {}) =>
    fetch(`${customerUrl}${path}`, {
      ...init,
      headers: { Authorization: 'Bearer anything', 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });

  const customerId = (await (await asStaff('/api/v1/customers?limit=1')).json()).items[0].id;
  const staffId = db.prepare("SELECT id FROM users WHERE role = 'agent' AND deleted_at IS NULL LIMIT 1").get().id;
  const ticket = await (await asStaff('/api/v1/tickets', {
    method: 'POST',
    body: JSON.stringify({ customerId, subject: 'Not the customer subject own ticket', body: 'Body.' }),
  })).json();

  return { db, app, asStaff, asTheCustomer, ticket, staffId };
}

// One call per route, driven for real. The key is the router's own entry.
const drive = (asTheCustomer, ticket, staffId) => ({
  [`PATCH ${API_V1_PREFIX}/tickets/:id/assignee`]: () =>
    asTheCustomer(`/api/v1/tickets/${ticket.id}/assignee`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeId: staffId, revision: ticket.revision }),
    }),
  [`PATCH ${API_V1_PREFIX}/tickets/:id/status`]: () =>
    asTheCustomer(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'open', revision: ticket.revision }),
    }),
  [`PATCH ${API_V1_PREFIX}/tickets/:id/category`]: () =>
    asTheCustomer(`/api/v1/tickets/${ticket.id}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ categoryId: null, revision: ticket.revision }),
    }),
  [`GET ${API_V1_PREFIX}/tickets/:id/history`]: () =>
    asTheCustomer(`/api/v1/tickets/${ticket.id}/history`),
  [`GET ${API_V1_PREFIX}/tickets/:id/messages`]: () =>
    asTheCustomer(`/api/v1/tickets/${ticket.id}/messages`),
  [`POST ${API_V1_PREFIX}/tickets/:id/replies`]: () =>
    asTheCustomer(`/api/v1/tickets/${ticket.id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body: 'A reply a customer may not post here.' }),
    }),
});

test('every route under a ticket is covered by this census', async () => {
  const { app, asTheCustomer, ticket, staffId } = await start();
  // Read off the real application, so a route mounted anywhere is seen.
  const served = collectRoutes(app, API_V1_PREFIX).filter((entry) => UNDER_A_TICKET.test(entry));
  const covered = Object.keys(drive(asTheCustomer, ticket, staffId));

  const uncovered = served.filter((entry) => !covered.includes(entry));
  const stale = covered.filter((entry) => !served.includes(entry));

  assert.deepEqual(
    uncovered,
    [],
    `a route under /tickets/:id that no ownership check drives: ${uncovered.join(', ')}\n`
      + 'Add it to drive() and assert its refusal — a route protected on three paths out of four protects nothing.',
  );
  assert.deepEqual(stale, [], `driven route no longer served: ${stale.join(', ')}`);
  assert.ok(served.length > 0, 'the router served no ticket routes — the census is reading nothing');
});

test('a customer is refused on every one of them, and refused as not-found', async () => {
  const { asTheCustomer, ticket, staffId } = await start();

  for (const [route, call] of Object.entries(drive(asTheCustomer, ticket, staffId))) {
    const res = await call();
    assert.equal(res.status, 404, `${route} let a customer through`);
    const body = await res.json();
    // Same code and same body as a ticket that does not exist. A refusal that
    // said "not yours" would confirm to a stranger that it does.
    assert.equal(body.code, 'NOT_FOUND', route);
    assert.deepEqual(Object.keys(body).sort(), ['code', 'requestId'], route);
  }
});

test('a missing ticket answers a customer exactly as somebody else\'s does', async () => {
  const { asTheCustomer } = await start();
  const missing = await asTheCustomer('/api/v1/tickets/00000000-0000-4000-8000-000000000000/history');
  const someoneElses = await asTheCustomer('/api/v1/tickets/does-not-matter/history');

  assert.equal(missing.status, someoneElses.status);
  const a = await missing.json();
  const b = await someoneElses.json();
  assert.equal(a.code, b.code);
});

test('staff are not restricted by ownership — one organisation, one queue', async () => {
  const { asStaff, ticket, staffId } = await start();

  // SC-1. A guard that also blocked agents would break the queue this
  // sprint's predecessor shipped, so both halves are pinned.
  const assigned = await asStaff(`/api/v1/tickets/${ticket.id}/assignee`, {
    method: 'PATCH',
    body: JSON.stringify({ assigneeId: staffId, revision: ticket.revision }),
  });
  assert.equal(assigned.status, 200);

  const history = await asStaff(`/api/v1/tickets/${ticket.id}/history`);
  assert.equal(history.status, 200);
});
