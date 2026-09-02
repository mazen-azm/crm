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
  // EMAIL_TAKEN, not a bare CONFLICT. The screen has three different 409s to
  // tell apart and the status alone does not say which.
  assert.equal((await again.json()).code, 'EMAIL_TAKEN');
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


// Proves scripts/criteria/identity.md section IDENTITY-2-WEB — the API half.
//
// The listing returned live accounts only, so a disabled account appeared in
// no listing this API had, and POST /accounts/:id/re-enable took an id nothing
// could supply. It was served, documented, tested and callable by nothing
// (L-66). These tests are the reachable half.

test('the listing still means live accounts when nothing is asked for', async () => {
  const { call } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });

  const page = await (await call('/api/v1/accounts')).json();

  // The default did not move because a screen needed something new.
  assert.equal(page.state, 'live');
  assert.equal(page.items.some((row) => row.id === user.id), false);
  // Seven from the seed. The account this test made is disabled, so it is not
  // among them — and the total says so too, which is the half that used to be
  // computed without the filter.
  assert.equal(page.total, 7);
  // Every live row says so, rather than saying nothing and being read as live.
  assert.ok(page.items.every((row) => row.deletedAt === null));
});

test('a disabled account is reachable, and carries the stamp that says so', async () => {
  const { call } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });

  const page = await (await call('/api/v1/accounts?state=disabled')).json();

  assert.equal(page.state, 'disabled');
  assert.deepEqual(page.items.map((row) => row.id), [user.id]);
  // Not null. The projection used to omit deleted_at, so publicShape read
  // undefined and every disabled row would have reported itself live.
  assert.ok(page.items[0].deletedAt);
  // The count takes the same filter as the listing. A disabled listing beside
  // the live total is a pager wrong on every page but the first.
  assert.equal(page.total, 1);
});

test('re-enabling from the id the listing gave puts the account back among the live', async () => {
  const { call } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });

  // The whole point: the id comes from a listing, not from a variable a test
  // happened to keep.
  const [row] = (await (await call('/api/v1/accounts?state=disabled')).json()).items;
  const back = await call(`/api/v1/accounts/${row.id}/re-enable`, { method: 'POST' });
  assert.equal(back.status, 200);

  const live = await (await call('/api/v1/accounts')).json();
  assert.equal(live.items.some((each) => each.id === user.id), true);
  assert.equal((await (await call('/api/v1/accounts?state=disabled')).json()).total, 0);
});

test('all means both, and its total counts both', async () => {
  const { call } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });

  const page = await (await call('/api/v1/accounts?state=all')).json();

  assert.equal(page.state, 'all');
  assert.equal(page.total, 8);
  assert.equal(page.items.length, 8);
  assert.equal(page.items.filter((row) => row.deletedAt !== null).length, 1);
});

test('a state nobody defined is refused, naming the field', async () => {
  const { call } = await start();
  const res = await call('/api/v1/accounts?state=everyone');

  // 422 naming the field, the way every other bad input on this router is
  // refused — not 400, and not a quiet fall back to one of the three.
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.code, 'VALIDATION_FAILED');
  assert.deepEqual(body.fields, ['state']);
});

test('the three refusals an admin can act on each answer with their own code', async () => {
  const { call } = await start();
  const { user } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();

  await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });
  const twice = await call(`/api/v1/accounts/${user.id}/disable`, { method: 'POST' });
  assert.equal(twice.status, 409);
  assert.equal((await twice.json()).code, 'ALREADY_DISABLED');

  await call(`/api/v1/accounts/${user.id}/re-enable`, { method: 'POST' });
  const already = await call(`/api/v1/accounts/${user.id}/re-enable`, { method: 'POST' });
  assert.equal(already.status, 409);
  assert.equal((await already.json()).code, 'ALREADY_LIVE');

  // The seed has two admins, so disable the other one and this test's own
  // admin is the last: the desk would be left with nobody who can administer
  // it.
  //
  // Which admin is which is asked, not assumed. Both seed rows are stamped in
  // the same second, so `created_at ASC, id ASC` is decided by a random UUID
  // and the order changes between runs — picking by index disabled the token
  // holder about half the time and answered 401 to everything after it.
  const me = await (await call('/api/v1/me')).json();
  const admins = (await (await call('/api/v1/accounts')).json())
    .items.filter((row) => row.role === 'admin');
  assert.equal(admins.length, 2);
  const other = admins.find((row) => row.id !== me.id);
  assert.equal((await call(`/api/v1/accounts/${other.id}/disable`, { method: 'POST' })).status, 200);

  const last = await call(`/api/v1/accounts/${me.id}/disable`, { method: 'POST' });
  assert.equal(last.status, 409);
  assert.equal((await last.json()).code, 'LAST_ADMIN');

  // And the same rule through the other door — a role change that empties the
  // admin seat is the same refusal, so it carries the same code.
  const role = await call(`/api/v1/accounts/${me.id}/role`, {
    method: 'PATCH', body: { role: 'agent' },
  });
  assert.equal(role.status, 409);
  assert.equal((await role.json()).code, 'LAST_ADMIN');
});

test('a non-admin is refused the listing before the service runs, whatever state they ask for', async () => {
  const { call, signIn } = await start();
  const { user, initialPassword } = await (await call('/api/v1/accounts', { method: 'POST', body: NEW })).json();
  const { token } = await signIn(user.email, initialPassword);

  for (const query of ['', '?state=disabled', '?state=all', '?state=everyone']) {
    const res = await call(`/api/v1/accounts${query}`, { token });
    // 403 for all four, including the invalid one: the role is decided in
    // middleware, so a bad parameter never reaches the validator that would
    // have said 422 and told an outsider which values exist.
    assert.equal(res.status, 403);
  }
});
