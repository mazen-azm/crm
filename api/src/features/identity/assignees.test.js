// Proves scripts/criteria/identity.md section IDENTITY-5-API: any signed-in
// staff member reads the live staff a ticket can be assigned to, paginated by
// the ceiling every list obeys, in a row that carries id, name and role only.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'assignees-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = async (email, password) => {
    const res = await fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  };

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

  return { db, call, signIn, adminToken };
}

test('the list carries id, name and role — and no address', async () => {
  const { call } = await start();
  const res = await call('/api/v1/assignees');

  assert.equal(res.status, 200);
  const page = await res.json();
  assert.deepEqual(Object.keys(page).sort(), ['items', 'limit', 'offset', 'total']);
  assert.ok(page.items.length > 0);
  for (const row of page.items) {
    assert.deepEqual(Object.keys(row).sort(), ['id', 'name', 'role']);
  }
  // The email is the field this list deliberately does not carry: a picker does
  // not need staff addresses, and /accounts already exists for the admin who
  // does. Asserting its absence is what keeps it absent.
  const text = JSON.stringify(page);
  assert.ok(!text.includes('@'), 'no address may travel in the assignee list');
  assert.ok(!text.includes('password'));
});

test('an agent may read it — this list is not admin-only', async () => {
  const { call, signIn } = await start();
  const created = await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'picker@support-desk.local', name: 'Picker', role: 'agent' },
  });
  const { initialPassword } = await created.json();
  const { token: agentToken } = await signIn('picker@support-desk.local', initialPassword);

  const asAgent = await call('/api/v1/assignees', { token: agentToken });
  assert.equal(asAgent.status, 200);

  // An agent who cannot see the list cannot hand a ticket over, so the two
  // roles must get the same answer. /accounts is where they differ.
  const asAdmin = await call('/api/v1/assignees');
  assert.deepEqual(await asAgent.json(), await asAdmin.json());

  assert.equal((await call('/api/v1/accounts', { token: agentToken })).status, 403);
});

test('no token is 401, the same refusal every guarded route gives', async () => {
  const { call } = await start();
  const res = await call('/api/v1/assignees', { token: null });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, 'UNAUTHENTICATED');
});

test('both roles appear — an admin works tickets too', async () => {
  const { call } = await start();
  const { items } = await (await call('/api/v1/assignees?limit=50')).json();
  const roles = new Set(items.map((r) => r.role));
  assert.ok(roles.has('admin'), 'an admin is assignable');
  assert.ok(roles.has('agent'));
});

test('a disabled account leaves the list', async () => {
  const { call } = await start();
  const before = await (await call('/api/v1/assignees?limit=50')).json();
  const victim = before.items.find((r) => r.role === 'agent');

  assert.equal((await call(`/api/v1/accounts/${victim.id}/disable`, { method: 'POST' })).status, 200);

  const after = await (await call('/api/v1/assignees?limit=50')).json();
  assert.equal(after.total, before.total - 1);
  assert.ok(!after.items.some((r) => r.id === victim.id));
});

test('a customer cannot appear, and not because anything filters for one', async () => {
  const { db, call } = await start();
  const before = await (await call('/api/v1/assignees?limit=50')).json();

  // users holds staff only and customers are their own table, so this row has
  // nowhere to leak in from. The test exists to keep that structural, and to
  // make the absence of a role predicate in the source deliberate rather than
  // an oversight — see the comment on listAssignees.
  db.prepare(`
    INSERT INTO customers (id, email, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('cus-test', 'someone@example.com', 'A Customer', '2026-08-28', '2026-08-28');

  const after = await (await call('/api/v1/assignees?limit=50')).json();
  assert.equal(after.total, before.total);
  assert.deepEqual(after.items, before.items);
});

test('the page ceiling refuses, it does not clamp (BR-4)', async () => {
  const { call } = await start();
  const res = await call('/api/v1/assignees?limit=500');

  assert.equal(res.status, 422);
  const body = await res.json();
  assert.deepEqual(body.fields, ['limit']);
  // The field name only. A 422 that echoed the value would be a 422 that can
  // carry a password back to whoever sent one.
  assert.ok(!JSON.stringify(body).includes('500'));
});

test('the window pages, and the envelope reports it honestly', async () => {
  const { call } = await start();
  const all = await (await call('/api/v1/assignees?limit=50')).json();

  const first = await (await call('/api/v1/assignees?limit=2&offset=0')).json();
  const second = await (await call('/api/v1/assignees?limit=2&offset=2')).json();

  assert.equal(first.items.length, 2);
  assert.equal(first.limit, 2);
  assert.equal(second.offset, 2);
  assert.equal(first.total, all.total);
  assert.deepEqual(first.items, all.items.slice(0, 2));
  assert.deepEqual(second.items, all.items.slice(2, 4));
});
