// Proves scripts/criteria/customers.md section CUSTOMERS-3-API: a note is
// attached to a customer with who wrote it and when, audited in the same
// transaction, refused on a customer who is gone or a body that says nothing,
// and read back in the order it was written.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'notes-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start({ now } = {}) {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signInAs = async (email, password) =>
    (
      await (
        await fetch(`${url}/api/v1/sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
      ).json()
    ).token;

  const token = await signInAs(adminEmail, adminPassword);
  const call = (path, { method = 'GET', body, tok = token } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const aCustomer = async () => (await (await call('/api/v1/customers?limit=1')).json()).items[0].id;
  const auditCount = () => db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  return { db, call, aCustomer, auditCount, signInAs, token };
}

const write = (call, id, body) => call(`/api/v1/customers/${id}/notes`, { method: 'POST', body: { body } });

test('a note carries who wrote it and when', async () => {
  const { call, aCustomer } = await start();
  const id = await aCustomer();

  const res = await write(call, id, 'Called about the invoice.');
  assert.equal(res.status, 201);
  const note = await res.json();
  assert.deepEqual(Object.keys(note).sort(), ['authorId', 'body', 'createdAt', 'customerId', 'id']);
  assert.equal(note.customerId, id);
  assert.equal(note.body, 'Called about the invoice.');
  assert.ok(note.authorId, 'the admin who wrote it');
  assert.ok(note.createdAt.endsWith('Z'));
});

test('the note and its audit row are written together', async () => {
  const { call, aCustomer, auditCount } = await start();
  const id = await aCustomer();
  const before = auditCount();

  await write(call, id, 'Sent the replacement.');
  assert.equal(auditCount(), before + 1);
});

test('the audit verb says what it acted on', async () => {
  const { db, call, aCustomer } = await start();
  await write(call, await aCustomer(), 'Anything.');

  // rowid, not at: the seed and this note can share a second.
  const row = db.prepare('SELECT entity, verb FROM audit_events ORDER BY rowid DESC LIMIT 1').get();
  assert.equal(row.entity, 'customer_note');
  assert.equal(row.verb, 'customer_note.create');
});

test('a note on a customer who is gone is 404, and writes nothing', async () => {
  const { db, call, aCustomer, auditCount } = await start();
  const id = await aCustomer();
  db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run('2026-08-29', id);
  const before = auditCount();

  assert.equal((await write(call, id, 'Too late.')).status, 404);
  assert.equal((await write(call, 'no-such-customer', 'Nobody.')).status, 404);
  assert.equal(auditCount(), before, 'a refusal writes no audit row');
  assert.equal(db.prepare('SELECT count(*) AS n FROM customer_notes').get().n, 0);
});

test('a blank note is 422 naming the field, and writes nothing', async () => {
  const { db, call, aCustomer } = await start();
  const id = await aCustomer();

  // A value distinctive enough that finding it would mean something. The first
  // version of this test submitted 42 and asserted the response did not
  // contain "42" anywhere — which is a coin flip, because requestId is a
  // random UUID and hexadecimal is full of 42s. It passed alone and failed in
  // the suite.
  const TELLTALE = 'zzq-should-never-travel-zzq';
  for (const body of ['', '   ', null, TELLTALE.length]) {
    const res = await write(call, id, body);
    assert.equal(res.status, 422, `${JSON.stringify(body)} should be refused`);
    const answer = await res.json();
    assert.deepEqual(answer.fields, ['body']);
  }

  const named = await write(call, id, { note: TELLTALE });
  assert.equal(named.status, 422);
  // The field name travels; the value never does.
  assert.ok(!JSON.stringify(await named.json()).includes(TELLTALE));
  assert.equal(db.prepare('SELECT count(*) AS n FROM customer_notes').get().n, 0);
});

test('a note is stored trimmed', async () => {
  const { call, aCustomer } = await start();
  const note = await (await write(call, await aCustomer(), '   spaced out   ')).json();
  assert.equal(note.body, 'spaced out');
});

test('notes come back in the order they were written, even sharing a second', async () => {
  // One frozen clock: every note gets an identical createdAt, which is exactly
  // the case ORDER BY at cannot decide.
  const { call, aCustomer } = await start({ now: () => 1_800_000_000 });
  const id = await aCustomer();

  for (const body of ['first', 'second', 'third']) await write(call, id, body);

  const page = await (await call(`/api/v1/customers/${id}/notes`)).json();
  assert.deepEqual(page.items.map((n) => n.body), ['first', 'second', 'third']);
  const stamps = new Set(page.items.map((n) => n.createdAt));
  assert.equal(stamps.size, 1, 'all three share a timestamp — the order came from rowid');
});

test('the notes list pages, and refuses above the ceiling (BR-4)', async () => {
  const { call, aCustomer } = await start();
  const id = await aCustomer();
  for (let i = 0; i < 5; i += 1) await write(call, id, `note ${i}`);

  const first = await (await call(`/api/v1/customers/${id}/notes?limit=2`)).json();
  assert.equal(first.items.length, 2);
  assert.equal(first.total, 5);
  assert.deepEqual(first.items.map((n) => n.body), ['note 0', 'note 1']);

  const second = await (await call(`/api/v1/customers/${id}/notes?limit=2&offset=2`)).json();
  assert.deepEqual(second.items.map((n) => n.body), ['note 2', 'note 3']);

  const refused = await call(`/api/v1/customers/${id}/notes?limit=500`);
  assert.equal(refused.status, 422);
  assert.deepEqual((await refused.json()).fields, ['limit']);
});

test("one customer's notes are not another's", async () => {
  const { call } = await start();
  const both = (await (await call('/api/v1/customers?limit=2')).json()).items;
  await write(call, both[0].id, 'about the first');
  await write(call, both[1].id, 'about the second');

  const page = await (await call(`/api/v1/customers/${both[0].id}/notes`)).json();
  assert.deepEqual(page.items.map((n) => n.body), ['about the first']);
  assert.equal(page.total, 1);
});

test('reading notes is not a mutation', async () => {
  const { call, aCustomer, auditCount } = await start();
  const id = await aCustomer();
  await write(call, id, 'One note.');
  const before = auditCount();

  await call(`/api/v1/customers/${id}/notes`);
  assert.equal(auditCount(), before);
});

test('no token is 401 on both', async () => {
  const { call, aCustomer } = await start();
  const id = await aCustomer();
  assert.equal((await call(`/api/v1/customers/${id}/notes`, { tok: null })).status, 401);
  assert.equal((await write(call, id, 'x')).status, 201);
  assert.equal(
    (await call(`/api/v1/customers/${id}/notes`, { method: 'POST', body: { body: 'x' }, tok: null })).status,
    401,
  );
});

test('an agent may write and read them — not admin-only', async () => {
  const { call, aCustomer, signInAs, token } = await start();
  const res = await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'noter@support-desk.local', name: 'Noter', role: 'agent' },
    tok: token,
  });
  const { initialPassword } = await res.json();
  const agent = await signInAs('noter@support-desk.local', initialPassword);
  const id = await aCustomer();

  assert.equal((await call(`/api/v1/customers/${id}/notes`, { method: 'POST', body: { body: 'from an agent' }, tok: agent })).status, 201);
  assert.equal((await call(`/api/v1/customers/${id}/notes`, { tok: agent })).status, 200);
});
