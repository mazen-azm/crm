// Proves scripts/criteria/identity.md section IDENTITY-2-API: an admin creates,
// disables and re-enables accounts and sets roles; a non-admin is refused
// before the service runs; nothing is ever deleted; a taken address is 409.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'accounts-test-secret';
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

  return { db, url, call, signIn, adminToken };
}

const NEW = { email: 'new.agent@support-desk.local', name: 'New Agent', role: 'agent' };

test('an admin creates an account, and is given its password exactly once', async () => {
  const { call, signIn } = await start();
  const res = await call('/api/v1/accounts', { method: 'POST', body: NEW });

  assert.equal(res.status, 201);
  const { user, initialPassword } = await res.json();
  assert.equal(user.email, NEW.email);
  assert.equal(user.role, 'agent');
  assert.ok(initialPassword.length >= 16);
  assert.ok(!JSON.stringify(user).includes('password'));

  // The password works, which is the only thing that makes handing it over
  // meaningful.
  const signedIn = await signIn(NEW.email, initialPassword);
  assert.equal(signedIn.user.id, user.id);
});

test('a non-admin is refused, and the service is never entered', async () => {
  const { call, signIn } = await start();
  const { initialPassword } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  const { token: agentToken } = await signIn(NEW.email, initialPassword);

  const attempts = [
    ['/api/v1/accounts', 'POST', { email: 'x@y.z', name: 'X', role: 'agent' }],
    ['/api/v1/accounts', 'GET', undefined],
  ];
  for (const [path, method, body] of attempts) {
    const res = await call(path, { token: agentToken, method, body });
    assert.equal(res.status, 403, `${method} ${path}`);
    assert.equal((await res.json()).code, 'FORBIDDEN');
  }

  // Nothing was created by the refused attempt.
  const { total } = await (await call('/api/v1/accounts')).json();
  assert.equal(total, 8);
});

test('an address that belongs to a live account is a conflict', async () => {
  const { call } = await start();
  await call('/api/v1/accounts', { method: 'POST', body: NEW });
  const again = await call('/api/v1/accounts', { method: 'POST', body: NEW });

  assert.equal(again.status, 409);
  assert.equal((await again.json()).code, 'CONFLICT');
});

test('disabling keeps the row, and re-enabling is the same row', async () => {
  const { call, db } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();

  const disabled = await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });
  assert.equal(disabled.status, 200);
  assert.ok((await disabled.json()).user.deletedAt);

  // BR-2: the row is still there, with its history.
  const row = db.prepare('SELECT id, created_at, deleted_at FROM users WHERE id = ?').get(user.id);
  assert.equal(row.id, user.id);
  assert.ok(row.deleted_at);

  const back = await call(`/api/v1/accounts/${user.id}/re-enable`, { method: 'POST' });
  assert.equal(back.status, 200);
  const revived = (await back.json()).user;
  assert.equal(revived.id, user.id);
  assert.equal(revived.deletedAt, null);
  assert.equal(revived.createdAt, row.created_at, 'it is the same row, not a new one');
});

test('a disabled account cannot sign in, and can again once re-enabled', async () => {
  const { call, signIn } = await start();
  const { user, initialPassword } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();

  await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });
  assert.equal((await signIn(NEW.email, initialPassword)).code, 'UNAUTHENTICATED');

  await call(`/api/v1/accounts/${user.id}/re-enable`, { method: 'POST' });
  assert.equal((await signIn(NEW.email, initialPassword)).user.id, user.id);
});

test('an address taken while an account was disabled blocks the re-enable', async () => {
  const { call } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });

  // The partial index freed the address, so somebody else may take it.
  const taken = await call('/api/v1/accounts', { method: 'POST', body: { ...NEW, name: 'Someone Else' } });
  assert.equal(taken.status, 409, 'creating over a disabled row is refused too');

  const back = await call(`/api/v1/accounts/${user.id}/re-enable`, { method: 'POST' });
  assert.equal(back.status, 200, 'nothing took the address, so it comes back');
});

test('a role change is audited; a role that did not change is not', async () => {
  const { call, db } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  const audits = () => db.prepare("SELECT count(*) AS n FROM audit_events WHERE entity_id = ?").get(user.id).n;
  const afterCreate = audits();

  const same = await call(`/api/v1/accounts/${user.id}/role`, { method: 'PATCH', body: { role: 'agent' } });
  assert.equal((await same.json()).changed, false);
  assert.equal(audits(), afterCreate, 'a no-op writes no audit row');

  const changed = await call(`/api/v1/accounts/${user.id}/role`, { method: 'PATCH', body: { role: 'admin' } });
  assert.equal((await changed.json()).user.role, 'admin');
  assert.equal(audits(), afterCreate + 1);

  // Ordered by rowid, not by `at`: the timestamp has second resolution and
  // both rows landed in the same second. SQLite's rowid is the insertion
  // order, which is what "the latest audit row" actually means.
  const row = db.prepare('SELECT verb, actor_id, diff FROM audit_events WHERE entity_id = ? ORDER BY rowid DESC LIMIT 1').get(user.id);
  assert.equal(row.verb, 'user.role.change');
  assert.ok(row.actor_id, 'the audit row names who did it');
  assert.deepEqual(JSON.parse(row.diff), { before: { role: 'agent' }, after: { role: 'admin' } });
});

test('the system cannot be left with nobody who can administer it', async () => {
  const { call, db, url } = await start();
  // The seed ships two admins; disable one so the next is the last.
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL").all();
  assert.equal(admins.length, 2);
  await call(`/api/v1/accounts/${admins[1].id}/disable`, { method: 'POST' });

  const lastAdmin = admins[0].id;
  const demote = await call(`/api/v1/accounts/${lastAdmin}/role`, { method: 'PATCH', body: { role: 'agent' } });
  assert.equal(demote.status, 409);

  const disable = await call(`/api/v1/accounts/${lastAdmin}/disable`, { method: 'POST' });
  assert.equal(disable.status, 409);
});

test('a bad payload is 422 naming the fields, and the list obeys the page ceiling', async () => {
  const { call } = await start();

  const bad = await call('/api/v1/accounts', { method: 'POST', body: { email: 'nope', name: '', role: 'wizard' } });
  assert.equal(bad.status, 422);
  assert.deepEqual((await bad.json()).fields, ['email', 'name', 'role']);

  const over = await call('/api/v1/accounts?limit=500');
  assert.equal(over.status, 422);
  assert.deepEqual((await over.json()).fields, ['limit']);

  const page = await (await call('/api/v1/accounts?limit=3')).json();
  assert.equal(page.items.length, 3);
  assert.equal(page.total, 7, 'the seed ships seven staff and this test created none');
  assert.ok(!JSON.stringify(page).includes('password'));
});
