// Proves scripts/criteria/customers.md section CUSTOMERS-4-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'create-customer-secret';
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

  const add = (body, tok = token) => call('/api/v1/customers', { method: 'POST', body, tok });
  const count = (table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;

  return { db, call, add, count };
}

test('a customer is added, and the answer is the customer', async () => {
  const { add } = await start();
  const res = await add({ name: 'Hala Mahmoud', email: 'hala@example.com', phone: '+20 2 5555 0190' });

  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.name, 'Hala Mahmoud');
  assert.equal(created.email, 'hala@example.com');
  // The id is what the caller needs next; a message saying it worked is not.
  assert.ok(created.id);
});

test('adding a customer writes no user row', async () => {
  const { add, count } = await start();
  const before = count('users');

  assert.equal((await add({ name: 'Nobody Signs In' })).status, 201);

  // I-1: users and customers are two tables, and customers.user_id stays null
  // until a first sign-in. This route creates one of the two.
  assert.equal(count('users'), before, 'a customer is not a user');
  assert.equal(count('customers'), 8);
});

test('an email already on file is refused, naming the field', async () => {
  const { add } = await start();
  assert.equal((await add({ name: 'First', email: 'shared@example.com' })).status, 201);

  const second = await add({ name: 'Second', email: 'shared@example.com' });
  // 422 and not 500: the unique index would fire and escape as a raw SQLite
  // error, which is what CRM-82 found on categories. The service asks first.
  assert.equal(second.status, 422);
  const body = await second.json();
  assert.equal(body.code, 'VALIDATION_FAILED');
  assert.deepEqual(body.fields, ['email']);
});

test('the address is matched however it is capitalised', async () => {
  const { add } = await start();
  assert.equal((await add({ name: 'First', email: 'Case@Example.com' })).status, 201);
  // The column is COLLATE NOCASE, so these are one address and one person.
  const second = await add({ name: 'Second', email: 'case@example.com' });
  assert.equal(second.status, 422);
});

test('a retired customer does not hold their address against a new one', async () => {
  const { db, add } = await start();
  const res = await add({ name: 'Left Us', email: 'returning@example.com' });
  const { id } = await res.json();
  db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run('2026-01-01T00:00:00.000Z', id);

  // The unique index is partial — WHERE deleted_at IS NULL — and that is
  // deliberate, so the lookup asks the same question the index does.
  assert.equal((await add({ name: 'Came Back', email: 'returning@example.com' })).status, 201);
});

test('a customer with no email is accepted', async () => {
  const { add } = await start();
  const res = await add({ name: 'Telephone Only', phone: '+20 2 5555 0191' });
  assert.equal(res.status, 201);
  // Somebody who telephones may not have an address, and the desk still needs
  // them on file.
  assert.equal((await res.json()).email, null);
});

test('a blank email is the same as no email, not an invalid one', async () => {
  const { add } = await start();
  const res = await add({ name: 'Blank Fields', email: '   ', phone: '' });
  assert.equal(res.status, 201);
  const created = await res.json();
  // '' collapses to null so the partial unique index keeps meaning "one live
  // customer per address" rather than "one live customer with no address".
  assert.equal(created.email, null);
  assert.equal(created.phone, null);

  assert.equal((await add({ name: 'Another Blank', email: '' })).status, 201);
});

test('a name is required, and an email that is not one is refused', async () => {
  const { add } = await start();

  const noName = await add({ email: 'a@b.co' });
  assert.equal(noName.status, 422);
  assert.deepEqual((await noName.json()).fields, ['name']);

  const blankName = await add({ name: '   ' });
  assert.equal(blankName.status, 422);
  assert.deepEqual((await blankName.json()).fields, ['name']);

  const badEmail = await add({ name: 'Fine', email: 'not-an-address' });
  assert.equal(badEmail.status, 422);
  assert.deepEqual((await badEmail.json()).fields, ['email']);
});

test('the name is stored trimmed', async () => {
  const { add } = await start();
  const created = await (await add({ name: '  Padded Name  ' })).json();
  assert.equal(created.name, 'Padded Name');
});

test('adding a customer is audited', async () => {
  const { db, add } = await start();
  const before = db.prepare("SELECT count(*) AS n FROM audit_events WHERE entity = 'customer'").get().n;

  const created = await (await add({ name: 'Audited', email: 'audited@example.com' })).json();

  const row = db.prepare("SELECT * FROM audit_events WHERE entity = 'customer' ORDER BY rowid DESC LIMIT 1").get();
  assert.equal(db.prepare("SELECT count(*) AS n FROM audit_events WHERE entity = 'customer'").get().n, before + 1);
  assert.equal(row.verb, 'customer.create');
  assert.equal(row.entity_id, created.id);
  assert.deepEqual(JSON.parse(row.diff).after.email, 'audited@example.com');
});

test('a refused add writes nothing at all', async () => {
  const { db, add, count } = await start();
  const customers = count('customers');
  const audits = db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  assert.equal((await add({ name: '' })).status, 422);

  assert.equal(count('customers'), customers);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, audits);
});

test('signing in is required', async () => {
  const { add } = await start();
  assert.equal((await add({ name: 'Anonymous' }, null)).status, 401);
});
