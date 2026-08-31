// Proves scripts/criteria/customers.md section CUSTOMERS-8-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'soft-delete-secret';
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

  const remove = (call) => (id) => call(`/api/v1/customers/${id}`, { method: 'DELETE' });
  const list = async () => (await (await admin('/api/v1/customers?limit=100')).json()).items;
  const search = async (term) =>
    (await (await admin(`/api/v1/customers?q=${encodeURIComponent(term)}&limit=100`)).json()).items;
  const row = (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, admin, agent, add, customer, remove, list, search, row, audit };
}

test('the customer goes from the list and the search, and the row stays', async () => {
  const { remove, admin, customer, list, search, row } = await start();

  const res = await remove(admin)(customer.id);
  assert.equal(res.status, 200);
  const answer = await res.json();
  assert.equal(answer.id, customer.id);
  assert.ok(answer.deletedAt, 'the moment it happened, so a caller need not read it back');

  assert.ok(!(await list()).some((c) => c.id === customer.id));
  // By id, not by emptiness: the seed ships its own Aiko Tanaka, and a search
  // that came back empty would mean the seeded one had gone too. A test that
  // asserted emptiness would have been asserting a bug.
  assert.ok(!(await search('Aiko')).some((c) => c.id === customer.id));
  assert.ok((await search('Aiko')).length > 0, 'the seeded Aiko is untouched');

  // BR-1: nothing here is hard-deleted.
  const kept = row(customer.id);
  assert.ok(kept, 'the row survives');
  assert.equal(kept.deleted_at, answer.deletedAt);
  assert.equal(kept.name, 'Aiko Tanaka');
});

test('reading a known id still answers, and that is deliberate', async () => {
  const { remove, admin, customer } = await start();
  await remove(admin)(customer.id);

  const res = await admin(`/api/v1/customers/${customer.id}`);

  // A retired customer is not a missing one. Their tickets and their notes did
  // not stop existing when they left, and a desk reading a ticket's customer
  // would otherwise be told the person never existed.
  //
  // The rule was argued in a comment on findCustomerById and pinned by
  // nothing, because until this story nothing could delete a customer. A plan
  // for this story proposed making it 404 and would have changed it silently.
  assert.equal(res.status, 200);
  assert.equal((await res.json()).customer.name, 'Aiko Tanaka');
});

test('their tickets are left exactly as they are', async () => {
  const { remove, admin, customer } = await start();
  const ticket = await (await admin('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'Something is wrong', body: 'Body.' },
  })).json();

  await remove(admin)(customer.id);

  // A support history is what the desk is for. Deleting the person it is about
  // must not quietly delete what happened.
  const queue = await (await admin('/api/v1/tickets')).json();
  const still = queue.items.find((t) => t.id === ticket.id);
  assert.ok(still, 'the ticket is still in the queue');
  assert.equal(still.customerId, customer.id);
});

test('the trail keeps every row that named them, and gains one', async () => {
  const { remove, admin, customer, audit } = await start();
  const before = audit().filter((r) => r.entity_id === customer.id).length;
  assert.ok(before > 0, 'creating them was audited');

  await remove(admin)(customer.id);

  const theirs = audit().filter((r) => r.entity_id === customer.id);
  assert.equal(theirs.length, before + 1);
  const written = theirs.at(-1);
  assert.equal(written.verb, 'customer.delete');
  const diff = JSON.parse(written.diff);
  // What they were, so the trail can still say who was removed after the list
  // has stopped showing them.
  assert.equal(diff.before.name, 'Aiko Tanaka');
  assert.ok(diff.after.deletedAt);
});

test('an agent is refused, and nothing is written', async () => {
  const { remove, agent, customer, row, audit } = await start();
  const before = audit().length;

  const res = await remove(agent)(customer.id);

  // Deleting is an admin's, the way retiring a category is: it changes what
  // everybody else sees and no screen can undo it.
  assert.equal(res.status, 403);
  assert.equal(row(customer.id).deleted_at, null);
  assert.equal(audit().length, before);
});

test('deleting twice is not two events', async () => {
  const { remove, admin, customer, audit, row } = await start();
  await remove(admin)(customer.id);
  const after = { rows: audit().length, at: row(customer.id).deleted_at };

  const again = await remove(admin)(customer.id);

  assert.equal(again.status, 404);
  assert.equal(audit().length, after.rows);
  // And the moment it happened does not move.
  assert.equal(row(customer.id).deleted_at, after.at);
});

test('a customer nobody has is the same 404', async () => {
  const { remove, admin, customer } = await start();
  await remove(admin)(customer.id);

  const deleted = await remove(admin)(customer.id);
  const missing = await remove(admin)('no-such-customer');

  assert.equal(deleted.status, 404);
  assert.equal(missing.status, 404);
  const [a, b] = [await deleted.json(), await missing.json()];
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('the address they held goes back on the shelf', async () => {
  const { remove, admin, add, customer } = await start();
  await remove(admin)(customer.id);

  // The uniqueness is about LIVE customers, the way a retired category's name
  // is. The partial index says so and the create path asks the same question.
  const again = await add({ name: 'Somebody New', email: 'aiko@example.com' });
  assert.ok(again.id);
  assert.notEqual(again.id, customer.id);
});

test('their sign-in account is not touched, and this says so', async () => {
  const { db, remove, admin, add } = await start();
  const withSignIn = await add({ name: 'Has An Account', email: 'has-account@example.com' });
  await admin(`/api/v1/customers/${withSignIn.id}/sign-in`, { method: 'POST' });
  const userId = db.prepare('SELECT user_id FROM customers WHERE id = ?').get(withSignIn.id).user_id;
  assert.ok(userId, 'the grant linked an account');

  await remove(admin)(withSignIn.id);

  // Nothing in the backlog asks what happens to it, and the honest answer is
  // that this story does not touch it. Recorded as a test rather than left for
  // somebody to discover: the account remains, and can still sign in.
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  assert.ok(user);
  assert.equal(user.disabled_at ?? null, null);
});
