// Proves scripts/criteria/identity.md section IDENTITY-7-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { MIN_PASSWORD_LENGTH } from './identity.rules.js';

const SECRET = 'change-own-password-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

const NEW_PASSWORD = 'a-perfectly-good-new-password';

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
        Authorization: `Bearer ${tok}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  const adminToken = (await (await signIn(adminEmail, adminPassword)).json()).token;
  const admin = as(adminToken);

  const madeAgent = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'an-agent@support-desk.local', name: 'An Agent', role: 'agent' },
  })).json();

  const change = (call) => (body) => call('/api/v1/me/password', { method: 'POST', body });
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();
  const hashOf = (email) => db.prepare('SELECT password_hash AS h FROM users WHERE email = ?').get(email).h;

  return {
    db, as, signIn, admin, audit, hashOf,
    adminEmail, adminPassword, changeAsAdmin: change(admin),
    agent: madeAgent.user, agentPassword: madeAgent.initialPassword,
  };
}

test('the new password signs you in and the old one stops', async () => {
  const { signIn, adminEmail, adminPassword, changeAsAdmin } = await start();

  const res = await changeAsAdmin({ currentPassword: adminPassword, newPassword: NEW_PASSWORD });
  assert.equal(res.status, 200);
  // `token` joined them with IDENTITY-8-API: the change now ends every session
  // issued before it, including the one that made the request, so the answer
  // has to carry the one that replaces it. Still no password and no hash.
  assert.deepEqual(Object.keys(await res.json()).sort(), ['id', 'token', 'updatedAt']);

  assert.equal((await signIn(adminEmail, NEW_PASSWORD)).status, 200);
  assert.equal((await signIn(adminEmail, adminPassword)).status, 401);
});

test('changing your password does not sign you out', async () => {
  const { admin, adminPassword, changeAsAdmin } = await start();

  await changeAsAdmin({ currentPassword: adminPassword, newPassword: NEW_PASSWORD });

  // The token was issued against the old password and stays valid until it
  // expires. Ending other sessions is IDENTITY-8-API; this is the stated gap,
  // pinned so the day it closes, this line is where it shows.
  assert.equal((await admin('/api/v1/me')).status, 200);
});

test('a wrong current password is 401 and an unusable new one is 422', async () => {
  const { adminPassword, changeAsAdmin, hashOf, adminEmail } = await start();
  const before = hashOf(adminEmail);

  const wrong = await changeAsAdmin({ currentPassword: 'not-my-password', newPassword: NEW_PASSWORD });
  assert.equal(wrong.status, 401);
  assert.equal((await wrong.json()).code, 'UNAUTHENTICATED');

  const short = await changeAsAdmin({ currentPassword: adminPassword, newPassword: 'too-short' });
  assert.equal(short.status, 422);
  assert.deepEqual((await short.json()).fields, ['newPassword']);

  // Two different questions, answered differently on purpose. Sign-in gives
  // one refusal for a wrong password, an unknown address and a disabled
  // account so the response cannot be used to learn which addresses exist;
  // this caller is already authenticated and already knows the account exists,
  // so saying which half they got wrong leaks nothing.
  assert.equal(hashOf(adminEmail), before);
});

test('a new password equal to the current one is refused', async () => {
  const { adminPassword, changeAsAdmin, hashOf, adminEmail } = await start();
  const before = hashOf(adminEmail);

  const res = await changeAsAdmin({ currentPassword: adminPassword, newPassword: adminPassword });

  // A change that changes nothing is a change somebody believes they made —
  // and will act on, by not changing it again. It is caught by verifying the
  // new password against the STORED HASH: hashing it and comparing strings
  // would never fire, because every hash has its own salt.
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['newPassword']);
  assert.equal(hashOf(adminEmail), before);
});

test('a missing field is named rather than guessed at', async () => {
  const { adminPassword, changeAsAdmin } = await start();

  const noCurrent = await changeAsAdmin({ newPassword: NEW_PASSWORD });
  assert.equal(noCurrent.status, 422);
  assert.deepEqual((await noCurrent.json()).fields, ['currentPassword']);

  const noNew = await changeAsAdmin({ currentPassword: adminPassword });
  assert.equal(noNew.status, 422);
  assert.deepEqual((await noNew.json()).fields, ['newPassword']);

  for (const newPassword of ['', 'x'.repeat(MIN_PASSWORD_LENGTH - 1), 42, null]) {
    const res = await changeAsAdmin({ currentPassword: adminPassword, newPassword });
    assert.equal(res.status, 422, `newPassword ${JSON.stringify(newPassword)}`);
    assert.deepEqual((await res.json()).fields, ['newPassword']);
  }
});

test('every role uses this one route, including an admin on their own account', async () => {
  const { as, signIn, agent, agentPassword, admin, adminPassword } = await start();

  // An agent.
  const theAgent = as((await (await signIn(agent.email, agentPassword)).json()).token);
  assert.equal(
    (await theAgent('/api/v1/me/password', {
      method: 'POST',
      body: { currentPassword: agentPassword, newPassword: NEW_PASSWORD },
    })).status,
    200,
  );

  // And an admin on their own account — which is the whole reason the admin
  // route for setting somebody else's password refuses a caller their own id.
  assert.equal(
    (await admin('/api/v1/me/password', {
      method: 'POST',
      body: { currentPassword: adminPassword, newPassword: 'another-good-password' },
    })).status,
    200,
  );
});

test('a customer changes their own password through the same route', async () => {
  const { admin, as, signIn } = await start();
  const customer = await (await admin('/api/v1/customers', {
    method: 'POST',
    body: { name: 'A Customer', email: 'a-customer@example.com' },
  })).json();
  const granted = await (await admin(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();
  const theCustomer = as((await (await signIn(customer.email, granted.initialPassword)).json()).token);

  // One route, every role. A second route for customers would be a second set
  // of rules about what a password may be.
  assert.equal(
    (await theCustomer('/api/v1/me/password', {
      method: 'POST',
      body: { currentPassword: granted.initialPassword, newPassword: NEW_PASSWORD },
    })).status,
    200,
  );
  assert.equal((await signIn(customer.email, NEW_PASSWORD)).status, 200);
});

test('nothing that opens the account reaches the answer or the trail', async () => {
  const { adminPassword, changeAsAdmin, audit, hashOf, adminEmail } = await start();

  const body = await (await changeAsAdmin({
    currentPassword: adminPassword,
    newPassword: NEW_PASSWORD,
  })).json();

  const text = JSON.stringify(body);
  assert.ok(!text.includes(NEW_PASSWORD));
  assert.ok(!text.includes(adminPassword));
  assert.ok(!text.includes(hashOf(adminEmail)));

  const row = audit().at(-1);
  assert.equal(row.verb, 'user.change-own-password');
  assert.ok(row.actor_id, 'the trail says who did it, and it is themselves');
  assert.equal(row.entity_id, row.actor_id);
  const diff = JSON.parse(row.diff);
  assert.equal(diff.before, null);
  // The keys, exactly. Checking the hash's absence by value catches nothing:
  // a fresh hash of the same password is a different string.
  assert.deepEqual(Object.keys(diff.after), ['passwordSetAt']);
});

test('an unsigned-in caller is 401 before any of this runs', async () => {
  const { audit } = await start();
  const [{ port }] = servers.slice(-1).map((s) => s.address());
  const before = audit().length;

  const res = await fetch(`http://127.0.0.1:${port}/api/v1/me/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'anything', newPassword: NEW_PASSWORD }),
  });

  assert.equal(res.status, 401);
  assert.equal(audit().length, before);
});
