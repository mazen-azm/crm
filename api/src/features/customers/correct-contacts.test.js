// Proves scripts/criteria/customers.md section CUSTOMERS-7-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'correct-contacts-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = (email, password) =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const as = (tok) => (path, init = {}) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  const admin = as((await (await signIn(adminEmail, adminPassword)).json()).token);

  const madeAgent = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'an-agent@support-desk.local', name: 'An Agent', role: 'agent' },
  })).json();
  const agent = as((await (await signIn(madeAgent.user.email, madeAgent.initialPassword)).json()).token);

  const add = async (body) => (await (await admin('/api/v1/customers', { method: 'POST', body })).json());
  const customer = await add({ name: 'Aiko Tanaka', email: 'aiko@example.com', phone: '+20 2 5555 0177' });

  const correct = (call) => (id, patch) => call(`/api/v1/customers/${id}`, { method: 'PATCH', body: patch });
  const row = (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, admin, agent, add, customer, correct, row, audit };
}

test('one field is corrected and the others are left exactly as they were', async () => {
  const { correct, admin, customer, row } = await start();

  const res = await correct(admin)(customer.id, { phone: '  +20 2 5555 0199  ' });
  assert.equal(res.status, 200);
  const after = await res.json();

  // Trimmed, because normaliseCustomer is the same one creation runs.
  assert.equal(after.phone, '+20 2 5555 0199');
  // A correction is usually one field. A route that needed all three would
  // make a screen send whatever it last read for the other two.
  assert.equal(after.name, 'Aiko Tanaka');
  assert.equal(after.email, 'aiko@example.com');
  assert.equal(row(customer.id).name, 'Aiko Tanaka');
});

test('the audit row carries only what moved, on both sides', async () => {
  const { correct, admin, customer, audit } = await start();
  const before = audit().length;

  await correct(admin)(customer.id, { email: 'aiko.new@example.com' });

  const written = audit().at(-1);
  assert.equal(audit().length, before + 1);
  assert.equal(written.verb, 'customer.update');
  const diff = JSON.parse(written.diff);
  // Not every field. A diff listing three fields when one changed is a diff
  // nobody reads, and the trail is read by whoever is on the phone.
  assert.deepEqual(Object.keys(diff.before), ['email']);
  assert.deepEqual(diff.before, { email: 'aiko@example.com' });
  assert.deepEqual(diff.after, { email: 'aiko.new@example.com' });
});

test('the whole customer is validated, not only the fields that arrived', async () => {
  const { correct, admin, customer, row } = await start();

  // Clearing the name is refused even though the name is the field being
  // sent — "a customer needs a name" is a rule about a customer. Checking
  // only what was sent would need the same rule written twice.
  const res = await correct(admin)(customer.id, { name: '   ' });
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['name']);
  assert.equal(row(customer.id).name, 'Aiko Tanaka');
});

test('a malformed value is refused by the same rule creation uses', async () => {
  const { correct, admin, customer, add } = await start();

  for (const [patch, field] of [
    [{ email: 'not-an-address' }, 'email'],
    [{ phone: 42 }, 'phone'],
    [{ name: 42 }, 'name'],
  ]) {
    const res = await correct(admin)(customer.id, patch);
    assert.equal(res.status, 422, JSON.stringify(patch));
    assert.deepEqual((await res.json()).fields, [field], JSON.stringify(patch));
  }

  // And the same value is refused at creation, which is the point of sharing
  // the validator: two sets of rules for one field disagree the first time
  // either is edited.
  const created = await add({ name: 'Someone', email: 'not-an-address' });
  assert.equal(created.code, 'VALIDATION_FAILED');
});

test('an address another live customer holds is refused, and their own is not', async () => {
  const { correct, admin, add, customer } = await start();
  await add({ name: 'Somebody Else', email: 'other@example.com' });

  const taken = await correct(admin)(customer.id, { email: 'other@example.com' });
  assert.equal(taken.status, 422);
  assert.deepEqual((await taken.json()).fields, ['email']);

  // Their own address is not a conflict with themselves — but it is also not a
  // change, so it is refused for that reason and names the field that was
  // sent rather than the word `email`.
  const same = await correct(admin)(customer.id, { email: 'aiko@example.com' });
  assert.equal(same.status, 422);
  assert.deepEqual((await same.json()).fields, ['email']);
});

test('an address a SEEDED customer holds is refused like any other', async () => {
  const { correct, admin, customer } = await start();

  // The seed is not scaffolding. It writes real customers — Aiko Tanaka at
  // aiko.tanaka@example.com among them — and a rule that only saw rows a test
  // created would pass while the product failed on the data it ships with.
  // This test exists because writing it the other way round found exactly
  // that: an address chosen as "obviously free" was one the seed holds.
  const res = await correct(admin)(customer.id, { email: 'aiko.tanaka@example.com' });
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['email']);
});

test('correcting the CASE of your own address is allowed, and is a change', async () => {
  const { correct, admin, add } = await start();
  // The seed ships one: Marcus.Bell@Example.com.
  const marcus = await add({ name: 'Marcus Bell', email: 'Marcus.Bell@Example.co' });

  const res = await correct(admin)(marcus.id, { email: 'marcus.bell@example.co' });

  // The column is COLLATE NOCASE, so the uniqueness lookup finds Marcus
  // himself. Comparing the ids rather than only asking whether somebody holds
  // the address is what makes this possible — without it, an address typed
  // with capitals could never be tidied, because its owner would be reported
  // as its own conflict.
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, 'marcus.bell@example.co');
});

test('a deleted customer’s address is free again', async () => {
  const { db, correct, admin, add, customer } = await start();
  const gone = await add({ name: 'Departed', email: 'departed@example.com' });
  db.prepare("UPDATE customers SET deleted_at = ? WHERE id = ?").run('2026-08-31T00:00:00.000Z', gone.id);

  // The uniqueness is about LIVE customers, the way a retired category's name
  // goes back on the shelf. The partial index says so and this asks the same
  // question the index does.
  const res = await correct(admin)(customer.id, { email: 'departed@example.com' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, 'departed@example.com');
});

test('a request that changes nothing is refused, and writes nothing', async () => {
  const { correct, admin, customer, audit, row } = await start();
  const before = { rows: audit().length, updated: row(customer.id).updated_at };

  for (const [patch, fields] of [
    [{}, ['changes']],
    [{ name: 'Aiko Tanaka' }, ['name']],
    [{ name: 'Aiko Tanaka', phone: '+20 2 5555 0177' }, ['name', 'phone']],
  ]) {
    const res = await correct(admin)(customer.id, patch);
    assert.equal(res.status, 422, JSON.stringify(patch));
    assert.deepEqual((await res.json()).fields, fields, JSON.stringify(patch));
  }

  // No audit row saying nothing happened, and updated_at does not move — a
  // customer that looks edited when nobody edited it is a lie the trail tells.
  assert.equal(audit().length, before.rows);
  assert.equal(row(customer.id).updated_at, before.updated);
});

test('a field this route does not own cannot be written through it', async () => {
  const { correct, admin, customer, row } = await start();

  // `address` exists as a column and no route has ever written it; `user_id`
  // is CUSTOMERS-6-API's and is how somebody signs in. Sending either is not
  // a correction — and because neither is a correctable field, the request
  // carries no change at all.
  const res = await correct(admin)(customer.id, { address: 'somewhere', user_id: 'u-1' });
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['changes']);
  assert.equal(row(customer.id).user_id, null);
});

test('all three at once is one row and one audit entry', async () => {
  const { correct, admin, customer, audit } = await start();
  const before = audit().length;

  const after = await (await correct(admin)(customer.id, {
    name: 'Aiko Tanaka-Smith',
    email: 'aiko.ts@example.com',
    phone: null,
  })).json();

  assert.equal(after.name, 'Aiko Tanaka-Smith');
  assert.equal(after.phone, null);
  assert.equal(audit().length, before + 1);
  const diff = JSON.parse(audit().at(-1).diff);
  assert.deepEqual(Object.keys(diff.after).sort(), ['email', 'name', 'phone']);
});

test('a deleted customer is the same 404 a missing one gets', async () => {
  const { db, correct, admin, add } = await start();
  const gone = await add({ name: 'Departed', email: 'departed@example.com' });
  db.prepare("UPDATE customers SET deleted_at = ? WHERE id = ?").run('2026-08-31T00:00:00.000Z', gone.id);

  const deleted = await correct(admin)(gone.id, { phone: '+20 2 5555 0100' });
  const missing = await correct(admin)('no-such-customer', { phone: '+20 2 5555 0100' });

  // Reading a deleted customer is allowed — their tickets and notes did not
  // stop existing. Correcting one is not: there is nobody to correct.
  assert.equal(deleted.status, 404);
  assert.equal(missing.status, 404);
  const [a, b] = [await deleted.json(), await missing.json()];
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('an agent may correct, because an agent is who is on the telephone', async () => {
  const { correct, agent, customer } = await start();

  // Not admin-only. The desk's work is not an admin's alone, and the person
  // who mishears an address is the person who should fix it.
  const res = await correct(agent)(customer.id, { phone: '+20 2 5555 0111' });
  assert.equal(res.status, 200);
});
