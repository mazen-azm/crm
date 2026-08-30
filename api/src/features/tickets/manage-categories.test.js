// Proves scripts/criteria/tickets.md section TICKETS-9-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'manage-categories-secret';
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

  const add = (name) => admin('/api/v1/ticket-categories', { method: 'POST', body: { name } });
  const rename = (id, name) => admin(`/api/v1/ticket-categories/${id}`, { method: 'PATCH', body: { name } });
  const retire = (id) => admin(`/api/v1/ticket-categories/${id}`, { method: 'DELETE' });
  const list = async () => (await (await admin('/api/v1/ticket-categories?limit=100')).json()).items;
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();
  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async (categoryId) =>
    (await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Filed', body: 'Body.', categoryId },
    })).json());

  return { db, admin, agent, add, rename, retire, list, audit, raise };
}

test('an admin adds a category, and the form offers it', async () => {
  const { add, list, audit } = await start();
  const before = audit().length;

  const res = await add('  Refunds  ');
  assert.equal(res.status, 201);
  const made = await res.json();

  // Stored trimmed: "Refunds " and "Refunds" are one category, and the
  // difference shows up later as two rows the unique index was meant to stop.
  assert.equal(made.name, 'Refunds');
  assert.deepEqual(Object.keys(made).sort(), ['createdAt', 'id', 'name', 'updatedAt']);
  assert.ok((await list()).some((c) => c.id === made.id));

  const row = audit().at(-1);
  assert.equal(row.verb, 'category.create');
  assert.equal(JSON.parse(row.diff).after.name, 'Refunds');
  assert.equal(audit().length, before + 1);
});

test('two categories differing only in case are one category typed twice', async () => {
  const { add, list } = await start();
  await add('Refunds');
  const before = (await list()).length;

  const res = await add('rEfUnDs');

  // A desk with "Billing" and "billing" in its picker is a desk whose reports
  // do not add up. Refused here rather than by the unique index, because an
  // index that fires gives a 500 that tells an admin their reasonable request
  // was our fault.
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['name']);
  assert.equal((await list()).length, before);
});

test('a rename reaches every ticket already carrying the category', async () => {
  const { add, rename, raise, admin } = await start();
  const made = await (await add('Refunds')).json();
  const ticket = await raise(made.id);

  await rename(made.id, 'Money back');

  // The ticket references the category rather than copying its name, which is
  // what makes a rename possible at all — and why `raise` stores an id.
  const categories = (await (await admin('/api/v1/ticket-categories?limit=100')).json()).items;
  assert.equal(categories.find((c) => c.id === made.id).name, 'Money back');
  const queue = await (await admin('/api/v1/tickets')).json();
  assert.equal(queue.items.find((t) => t.id === ticket.id).categoryId, made.id);
});

test('renaming a category to what it is already called is not a conflict with itself', async () => {
  const { add, rename } = await start();
  const made = await (await add('Refunds')).json();

  // Refusing this would make "no change" indistinguishable from "that name is
  // taken", which is a worse answer than doing nothing.
  const res = await rename(made.id, 'Refunds');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, 'Refunds');
});

test('a rename onto another live category’s name is refused', async () => {
  const { add, rename } = await start();
  const first = await (await add('Refunds')).json();
  await add('Billing enquiries');

  const res = await rename(first.id, 'billing enquiries');
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['name']);
});

test('retiring takes it off the list and leaves its tickets alone', async () => {
  const { add, retire, raise, list, admin, audit } = await start();
  const made = await (await add('Refunds')).json();
  const ticket = await raise(made.id);
  const before = audit().length;

  const res = await retire(made.id);
  assert.equal(res.status, 200);
  assert.ok((await res.json()).retiredAt);

  // Off the list the form offers...
  assert.ok(!(await list()).some((c) => c.id === made.id));
  // ...and still on the ticket. A category that vanished from its tickets
  // would rewrite history to tidy a picker (BR-1).
  const queue = await (await admin('/api/v1/tickets')).json();
  assert.equal(queue.items.find((t) => t.id === ticket.id).categoryId, made.id);

  const row = audit().at(-1);
  assert.equal(row.verb, 'category.retire');
  assert.equal(audit().length, before + 1);
});

test('a retired category cannot take a new ticket', async () => {
  const { add, retire, raise } = await start();
  const made = await (await add('Refunds')).json();
  await retire(made.id);

  // `raise` already refused a retired category through findLiveCategoryId, and
  // this story does not weaken it.
  const res = await raise(made.id);
  assert.equal(res.code ?? null, 'VALIDATION_FAILED');
});

test('a retired category’s name goes back on the shelf', async () => {
  const { add, retire, list } = await start();
  const made = await (await add('Refunds')).json();
  await retire(made.id);

  // Uniqueness is about LIVE categories, the way a customer's address is: the
  // index is partial and scoped to deleted_at IS NULL.
  const again = await add('Refunds');
  assert.equal(again.status, 201);
  const remade = await again.json();
  assert.notEqual(remade.id, made.id);
  assert.equal((await list()).filter((c) => c.name === 'Refunds').length, 1);
});

test('a retired category is not renamed, and not retired twice', async () => {
  const { add, rename, retire, audit } = await start();
  const made = await (await add('Refunds')).json();
  await retire(made.id);
  const before = audit().length;

  // Its name is what the tickets carrying it say happened, and BR-1 keeps them
  // for exactly that.
  assert.equal((await rename(made.id, 'Something else')).status, 404);
  assert.equal((await retire(made.id)).status, 404);
  assert.equal(audit().length, before);
});

test('a name that is not a name is refused, and writes nothing', async () => {
  const { add, list, audit } = await start();
  const before = { count: (await list()).length, rows: audit().length };

  for (const name of [undefined, null, '', '   ', 42, 'x'.repeat(201)]) {
    const res = await add(name);
    assert.equal(res.status, 422, JSON.stringify(name)?.slice(0, 20));
    assert.deepEqual((await res.json()).fields, ['name']);
  }
  assert.equal((await list()).length, before.count);
  assert.equal(audit().length, before.rows);
});

test('an agent may read the list and may not manage it', async () => {
  const { add, agent, list } = await start();
  const made = await (await add('Refunds')).json();
  const before = (await list()).length;

  // Reading is any staff member's — an agent who cannot see the categories
  // cannot raise a ticket. Managing is not, and the service never runs (SC-2).
  assert.equal((await agent('/api/v1/ticket-categories')).status, 200);
  assert.equal((await agent('/api/v1/ticket-categories', { method: 'POST', body: { name: 'Mine' } })).status, 403);
  assert.equal((await agent(`/api/v1/ticket-categories/${made.id}`, { method: 'PATCH', body: { name: 'X' } })).status, 403);
  assert.equal((await agent(`/api/v1/ticket-categories/${made.id}`, { method: 'DELETE' })).status, 403);
  assert.equal((await list()).length, before);
});

test('a category nobody has is 404', async () => {
  const { rename, retire } = await start();
  assert.equal((await rename('no-such-category', 'Anything')).status, 404);
  assert.equal((await retire('no-such-category')).status, 404);
});
