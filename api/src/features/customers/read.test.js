// Proves scripts/criteria/customers.md section CUSTOMERS-2-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'customer-read-secret';
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
  const raise = async (subject = 'A ticket') =>
    (await (await call('/api/v1/tickets', {
      method: 'POST', body: { customerId, subject, body: 'Body.' },
    })).json());
  const read = (id = customerId, query = '') => call(`/api/v1/customers/${id}${query}`);

  return { db, call, customerId, raise, read };
}

test('the customer, their open tickets and their notes arrive together', async () => {
  const { call, customerId, raise, read } = await start();
  await raise('First');
  await raise('Second');
  await call(`/api/v1/customers/${customerId}/notes`, { method: 'POST', body: { body: 'Rang about the invoice.' } });

  const res = await read();
  assert.equal(res.status, 200);
  const body = await res.json();

  // One answer, one moment. Three requests would show three.
  assert.deepEqual(Object.keys(body).sort(), ['customer', 'notes', 'tickets']);
  assert.equal(body.customer.id, customerId);
  assert.equal(body.tickets.total, 2);
  assert.equal(body.notes.total, 1);
  assert.equal(body.notes.items[0].body, 'Rang about the invoice.');
});

test('"open" means every status the desk has not finished with', async () => {
  const { call, raise, read } = await start();
  const resolved = await raise('Will be resolved');
  const closed = await raise('Will be closed');
  const pending = await raise('Waiting on them');

  const move = (t, status, note) =>
    call(`/api/v1/tickets/${t.id}/status`, {
      method: 'PATCH', body: { status, revision: t.revision, ...(note ? { note } : {}) },
    });

  await move(resolved, 'resolved', 'Done.');
  const closedOnce = await (await move(closed, 'resolved', 'Done.')).json();
  await move(closedOnce, 'closed');
  await move(pending, 'pending');

  const body = await (await read()).json();
  const subjects = body.tickets.items.map((t) => t.subject);

  // pending is waiting on the customer and is still the desk's work; resolved
  // and closed are the two it has finished with. Not the status called `open`.
  assert.ok(subjects.includes('Waiting on them'));
  assert.ok(!subjects.includes('Will be resolved'));
  assert.ok(!subjects.includes('Will be closed'));
});

test('the tickets are paged with the ceiling every list obeys', async () => {
  const { raise, read } = await start();
  for (const n of ['One', 'Two', 'Three']) await raise(n);

  const first = await (await read(undefined, '?limit=2')).json();
  assert.equal(first.tickets.items.length, 2);
  assert.equal(first.tickets.total, 3, 'the total counts the tickets, not the page');

  const second = await (await read(undefined, '?limit=2&offset=2')).json();
  assert.equal(second.tickets.items.length, 1);

  const tooMany = await read(undefined, '?limit=10000');
  assert.equal(tooMany.status, 422);
  assert.deepEqual((await tooMany.json()).fields, ['limit']);
});

test('the customer is not paginated — only their tickets are', async () => {
  const { read } = await start();
  const body = await (await read(undefined, '?limit=1')).json();
  // A page of one ticket does not make a page of one customer.
  assert.equal(Object.hasOwn(body.customer, 'limit'), false);
  assert.ok(body.customer.name);
});

test('a customer who is not on file is 404, not an empty shape', async () => {
  const { read } = await start();
  const res = await read('00000000-0000-4000-8000-000000000000');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, 'NOT_FOUND');
});

test('a customer with nothing on file reads as empty, which is not the same', async () => {
  const { call, read } = await start();
  const fresh = await (await call('/api/v1/customers', {
    method: 'POST', body: { name: 'Brand New' },
  })).json();

  const body = await (await read(fresh.id)).json();
  assert.equal(body.tickets.total, 0);
  assert.equal(body.notes.total, 0);
  assert.equal(body.customer.name, 'Brand New');
});

test('a retired customer still reads back, with their tickets', async () => {
  const { db, customerId, raise, read } = await start();
  await raise('Raised before they left');
  db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run('2026-01-01T00:00:00.000Z', customerId);

  const res = await read();
  // The list hides them. Reading a known id does not — a removed customer is
  // not a missing one, and their tickets did not stop existing.
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.customer.id, customerId);
  assert.equal(body.tickets.total, 1);
});

test('reading a customer writes no audit row', async () => {
  const { db, read } = await start();
  const before = db.prepare('SELECT count(*) AS n FROM audit_events').get().n;
  await read();
  await read(undefined, '?limit=1');
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, before);
});

test('signing in is required', async () => {
  const { call, customerId } = await start();
  assert.equal((await call(`/api/v1/customers/${customerId}`, { tok: null })).status, 401);
});
