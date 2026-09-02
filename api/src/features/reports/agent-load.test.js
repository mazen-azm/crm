// Proves scripts/criteria/reports.md section REPORTS-3-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'agent-load-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = async (email, password) =>
    (await fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })).json();

  const { token: adminToken } = await signIn(adminEmail, adminPassword);
  const call = (path, { token = adminToken, method = 'GET', body } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const customerId = (await (await call('/api/v1/customers?limit=1')).json()).items[0].id;

  const raise = async (subject = 'Something is wrong') =>
    (await (await call('/api/v1/tickets', { method: 'POST', body: { customerId, subject, body: 'Body.' } })).json());

  const assign = (ticket, assigneeId) =>
    call(`/api/v1/tickets/${ticket.id}/assignee`, {
      method: 'PATCH',
      body: { assigneeId, revision: ticket.revision },
    });

  const move = (ticket, status, note) =>
    call(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status, revision: ticket.revision, ...(note ? { note } : {}) },
    });

  const readTicket = async (id) => (await (await call(`/api/v1/tickets/${id}`)).json());
  const load = async (token = adminToken) => (await (await call('/api/v1/reports/agent-load', { token })).json());
  const staff = async () => (await (await call('/api/v1/accounts')).json()).items;

  return { db, call, signIn, raise, assign, move, readTicket, load, staff };
}

test('every live staff member has a row, and the ones holding nothing say zero', async () => {
  const { load, staff } = await start();

  const { agents } = await load();
  const live = await staff();

  // The whole point. A GROUP BY over tickets could only have returned people
  // who hold something — and the person an admin opens this report to find is
  // the one who does not.
  assert.equal(agents.length, live.length);
  assert.ok(agents.every((each) => each.load === 0));
});

test('load means work still on the person, not everything they have ever touched', async () => {
  const { raise, assign, move, readTicket, load, staff } = await start();
  const [agent] = (await staff()).filter((each) => each.role === 'agent');

  for (const subject of ['One', 'Two', 'Three']) {
    await assign(await raise(subject), agent.id);
  }
  const holding = (await load()).agents.find((each) => each.id === agent.id);
  assert.equal(holding.load, 3);

  // A fourth, taken and then finished. It stays theirs in the history and
  // leaves their plate — a count of everything they ever touched would be a
  // career total, not a workload.
  const fourth = await raise('Four');
  await assign(fourth, agent.id);
  await move(await readTicket(fourth.id), 'resolved', 'Fixed.');

  const after = (await load()).agents.find((each) => each.id === agent.id);
  assert.equal(after.load, 3);
});

test('a soft-deleted ticket is on nobody', async () => {
  const { db, raise, assign, load, staff } = await start();
  const [agent] = (await staff()).filter((each) => each.role === 'agent');

  const gone = await raise('Deleted later');
  await assign(gone, agent.id);
  await assign(await raise('Still here'), agent.id);
  db.prepare('UPDATE tickets SET deleted_at = ? WHERE id = ?')
    .run('2026-09-02T00:00:00.000Z', gone.id);

  const row = (await load()).agents.find((each) => each.id === agent.id);
  assert.equal(row.load, 1);
});

test('a disabled account has no row, because the question is who can take work now', async () => {
  const { call, load, staff } = await start();
  const [agent] = (await staff()).filter((each) => each.role === 'agent');

  const before = (await load()).agents.length;
  await call(`/api/v1/accounts/${agent.id}/disable`, { method: 'POST' });

  const { agents } = await load();
  assert.equal(agents.length, before - 1);
  assert.equal(agents.some((each) => each.id === agent.id), false);
});

test('work nobody has taken is its own figure, and never a person', async () => {
  const { raise, assign, load, staff } = await start();
  const [agent] = (await staff()).filter((each) => each.role === 'agent');

  await assign(await raise('Taken'), agent.id);
  await raise('Nobody has this');
  await raise('Nor this');

  const { agents, unassigned } = await load();

  assert.equal(unassigned, 2);
  // Not a row called "nobody" among the names — a name in a list of people is
  // a person, and this is the number an admin most needs to see.
  assert.equal(agents.some((each) => each.name === null || each.id === null), false);
  assert.equal(agents.find((each) => each.id === agent.id).load, 1);
});

test('a customer never appears, and no row carries an address', async () => {
  const { db, load } = await start();

  const { agents } = await load();

  const roles = new Set(agents.map((each) => each.role));
  assert.equal(roles.has('customer'), false);
  // The assignee picker leaves the address out on purpose; a load report needs
  // a name and a number for the same reason.
  assert.ok(agents.every((each) => !Object.hasOwn(each, 'email')));
  // And it is not that the users table has none.
  assert.ok(db.prepare('SELECT count(*) AS n FROM users WHERE email IS NOT NULL').get().n > 0);
});

test('the parts add up to the whole, and the report says when they do not', async () => {
  const { db, raise, assign, load, staff } = await start();
  const [agent] = (await staff()).filter((each) => each.role === 'agent');

  const held = await raise('Held');
  await assign(held, agent.id);
  await raise('On nobody');

  const first = await load();
  assert.equal(first.open, 2);
  assert.equal(first.unassigned, 1);
  assert.equal(first.unaccounted, 0);

  // Disable the account straight through the column, so the ticket is NOT
  // handed back the way IDENTITY-9-API hands it back. Now the ticket is open,
  // assigned, and its holder has no row: it is in neither figure.
  db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?')
    .run('2026-09-02T00:00:00.000Z', agent.id);

  const after = await load();
  assert.equal(after.open, 2);
  assert.equal(after.unassigned, 1);
  // Said out loud rather than swallowed. An admin adding up the rows would
  // otherwise reach 1 against an open count of 2 and have nothing to go on.
  assert.equal(after.unaccounted, 1);
});

test('an agent is refused, and the reader is never entered', async () => {
  const { call, signIn } = await start();
  const made = await (await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'load-reader@support-desk.local', name: 'A Reader', role: 'agent' },
  })).json();
  const { token } = await signIn(made.user.email, made.initialPassword);

  const res = await call('/api/v1/reports/agent-load', { token });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'FORBIDDEN');
});
