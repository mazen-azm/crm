// Proves scripts/criteria/tickets.md section TICKETS-6-API — the categories a
// form offers, and which of them a ticket may actually be raised against.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'categories-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const token = (await (await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })).json()).token;

  const call = (path, { method = 'GET', body, tok = token } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const customerId = (await (await call('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = (categoryId) =>
    call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'S', body: 'B', ...(categoryId !== undefined ? { categoryId } : {}) },
    });
  const retire = (id) =>
    db.prepare("UPDATE ticket_categories SET deleted_at = '2026-01-01T00:00:00.000Z' WHERE id = ?").run(id);
  const auditCount = () => db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  return { db, call, raise, retire, auditCount };
}

test('the categories read back, in name order, with the shape every list uses', async () => {
  const { call } = await start();
  const res = await call('/api/v1/ticket-categories');
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['items', 'limit', 'offset', 'total']);
  assert.equal(body.total, 6);
  assert.deepEqual(
    body.items.map((c) => c.name),
    ['Account access', 'Billing', 'Bug report', 'Feature request', 'Hardware', 'Onboarding'],
  );
  for (const item of body.items) {
    assert.deepEqual(Object.keys(item).sort(), ['createdAt', 'id', 'name', 'updatedAt']);
  }
});

test('the list is paged by the API and the ceiling is refused, not clamped', async () => {
  const { call } = await start();

  const first = await (await call('/api/v1/ticket-categories?limit=2')).json();
  assert.equal(first.items.length, 2);
  assert.equal(first.total, 6, 'total counts the whole list, not the page');

  const second = await (await call('/api/v1/ticket-categories?limit=2&offset=2')).json();
  assert.equal(second.items.length, 2);
  assert.notEqual(second.items[0].id, first.items[0].id);

  // BR-4. The same ceiling every other list obeys, and the same refusal.
  const tooMany = await call('/api/v1/ticket-categories?limit=10000');
  assert.equal(tooMany.status, 422);
  assert.deepEqual((await tooMany.json()).fields, ['limit']);
});

test('the list is filterable and sortable, and refuses a sort it does not know', async () => {
  const { call } = await start();

  const filtered = await (await call('/api/v1/ticket-categories?q=ill')).json();
  assert.deepEqual(filtered.items.map((c) => c.name), ['Billing']);
  assert.equal(filtered.total, 1, 'the count and the page must agree on the filter');

  const byAge = await (await call('/api/v1/ticket-categories?sort=created_at')).json();
  assert.equal(byAge.items.length, 6);

  const bad = await call('/api/v1/ticket-categories?sort=colour');
  assert.equal(bad.status, 422);
  assert.deepEqual((await bad.json()).fields, ['sort']);
});

test('a retired category leaves the list', async () => {
  const { db, call, retire } = await start();
  const billing = db.prepare("SELECT id FROM ticket_categories WHERE name = 'Billing'").get();
  retire(billing.id);

  const body = await (await call('/api/v1/ticket-categories')).json();
  assert.equal(body.total, 5);
  assert.equal(body.items.some((c) => c.id === billing.id), false);
});

test('a ticket already carrying a retired category still reads correctly', async () => {
  const { db, call, raise, retire } = await start();
  const billing = db.prepare("SELECT id FROM ticket_categories WHERE name = 'Billing'").get();

  const ticket = await (await raise(billing.id)).json();
  assert.equal(ticket.categoryId, billing.id);

  retire(billing.id);

  // The category left the list a form offers. The ticket that already carries
  // it is unchanged — the read path must not join the list's filter.
  const listed = (await (await call('/api/v1/tickets?limit=100')).json())
    .items.find((t) => t.id === ticket.id);
  assert.equal(listed.categoryId, billing.id);
});

test('a category that does not exist is the caller\'s mistake, not a server fault', async () => {
  const { raise } = await start();
  const res = await raise('no-such-category');

  // It used to be 500: the foreign key fired and SQLite's own error escaped.
  // E-2 says a failure returns its documented code, and bad input is 422.
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.code, 'VALIDATION_FAILED');
  assert.deepEqual(body.fields, ['categoryId']);
});

test('a retired category cannot be chosen when raising a ticket', async () => {
  const { db, raise, retire } = await start();
  const billing = db.prepare("SELECT id FROM ticket_categories WHERE name = 'Billing'").get();
  retire(billing.id);

  // The row is still there, so the foreign key is satisfied. deleted_at is
  // what takes it off the list, and only the service can see that.
  const res = await raise(billing.id);
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['categoryId']);
});

test('a ticket with no category at all is still ordinary', async () => {
  const { raise } = await start();
  const none = await raise(undefined);
  assert.equal(none.status, 201);
  assert.equal((await none.json()).categoryId, null);

  const explicit = await raise(null);
  assert.equal(explicit.status, 201);
  assert.equal((await explicit.json()).categoryId, null);
});

test('reading the categories writes no audit row', async () => {
  const { call, auditCount } = await start();
  const before = auditCount();
  await call('/api/v1/ticket-categories');
  await call('/api/v1/ticket-categories?q=bug&limit=1');
  assert.equal(auditCount(), before);
});

test('signing in is required', async () => {
  const { call } = await start();
  assert.equal((await call('/api/v1/ticket-categories', { tok: null })).status, 401);
});
