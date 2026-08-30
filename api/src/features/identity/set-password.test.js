// Proves scripts/criteria/identity.md section IDENTITY-6-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { MIN_PASSWORD_LENGTH, validateCredentials, validateNewPassword } from './identity.rules.js';

const SECRET = 'set-password-secret';
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

  const adminSession = await (await signIn(adminEmail, adminPassword)).json();
  const admin = as(adminSession.token);

  // Somebody to be locked out. Created through the real route, so the account
  // is exactly what the product makes.
  const madeAgent = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'locked-out@support-desk.local', name: 'Locked Out', role: 'agent' },
  })).json();

  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();
  const hashOf = (id) => db.prepare('SELECT password_hash AS h FROM users WHERE id = ?').get(id).h;

  return {
    db, admin, as, signIn, audit, hashOf,
    adminId: adminSession.user?.id ?? db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail).id,
    agent: madeAgent.user,
    agentPassword: madeAgent.initialPassword,
  };
}

test('the new password works and the old one stops', async () => {
  const { admin, signIn, agent, agentPassword } = await start();

  assert.equal((await signIn(agent.email, agentPassword)).status, 200);

  const res = await admin(`/api/v1/accounts/${agent.id}/set-password`, {
    method: 'POST',
    body: { password: NEW_PASSWORD },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(await res.json()).sort(), ['id', 'updatedAt']);

  assert.equal((await signIn(agent.email, NEW_PASSWORD)).status, 200);
  // The old one is refused with the same 401 an unknown address gets — the
  // route says nothing about why.
  assert.equal((await signIn(agent.email, agentPassword)).status, 401);
});

test('nothing in the answer or the trail can open the account', async () => {
  const { admin, audit, agent, hashOf } = await start();

  const body = await (await admin(`/api/v1/accounts/${agent.id}/set-password`, {
    method: 'POST',
    body: { password: NEW_PASSWORD },
  })).json();

  const text = JSON.stringify(body);
  assert.ok(!text.includes(NEW_PASSWORD), 'the answer never carries the password');
  assert.ok(!text.includes(hashOf(agent.id)), 'nor the hash');

  const row = audit().at(-1);
  assert.equal(row.verb, 'user.set-password');
  assert.equal(row.entity_id, agent.id);
  assert.ok(row.actor_id, 'the trail says who did it');
  assert.ok(!row.diff.includes(NEW_PASSWORD));
  assert.ok(!row.diff.includes(hashOf(agent.id)));

  const diff = JSON.parse(row.diff);
  // A diff whose two halves say the same thing reads as a change that changed
  // nothing. What the trail needs is that it happened, and when.
  assert.equal(diff.before, null);
  // The KEYS, exactly. Asserting the hash's absence by its value catches
  // nothing: hashing the same password twice gives two different strings, so a
  // fresh hash added to the diff would not match the stored one and the check
  // would pass while the secret sat in the trail. A mutation proved it.
  assert.deepEqual(Object.keys(diff.after), ['passwordSetAt']);
  assert.ok(diff.after.passwordSetAt);
});

test('the hash is new every time, salt and all', async () => {
  const { admin, agent, hashOf } = await start();

  await admin(`/api/v1/accounts/${agent.id}/set-password`, { method: 'POST', body: { password: NEW_PASSWORD } });
  const first = hashOf(agent.id);
  await admin(`/api/v1/accounts/${agent.id}/set-password`, { method: 'POST', body: { password: NEW_PASSWORD } });

  // The same password stored twice produces two different hashes, which is
  // what having a salt means.
  assert.notEqual(hashOf(agent.id), first);
});

test('an admin may not use this on themselves', async () => {
  const { admin, adminId, audit } = await start();
  const before = audit().length;

  const res = await admin(`/api/v1/accounts/${adminId}/set-password`, {
    method: 'POST',
    body: { password: NEW_PASSWORD },
  });

  // 403: they are allowed on this route and not allowed on this target.
  // Setting somebody else's password is for a person who is locked out;
  // changing your own asks for the current one, and an admin who could skip
  // that check on themselves turns a stolen session into a permanent one.
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'FORBIDDEN');
  assert.equal(audit().length, before, 'a refusal writes no audit row');
});

test('a non-admin is refused, and the service never runs', async () => {
  const { admin, as, signIn, agent, agentPassword, hashOf } = await start();
  const theAgent = as((await (await signIn(agent.email, agentPassword)).json()).token);
  const other = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'other@support-desk.local', name: 'Other', role: 'agent' },
  })).json();
  const before = hashOf(other.user.id);

  const res = await theAgent(`/api/v1/accounts/${other.user.id}/set-password`, {
    method: 'POST',
    body: { password: NEW_PASSWORD },
  });

  assert.equal(res.status, 403);
  // SC-2: the decision is taken in middleware, before any service runs.
  assert.equal(hashOf(other.user.id), before);
});

test('a disabled account is refused — coming back is a different verb', async () => {
  const { admin, agent, hashOf, audit } = await start();
  await admin(`/api/v1/accounts/${agent.id}/disable`, { method: 'POST' });
  const before = { hash: hashOf(agent.id), rows: audit().length };

  const res = await admin(`/api/v1/accounts/${agent.id}/set-password`, {
    method: 'POST',
    body: { password: NEW_PASSWORD },
  });

  // Setting a password through this door would leave the account's state
  // saying one thing and its access saying another.
  assert.equal(res.status, 409);
  assert.equal(hashOf(agent.id), before.hash);
  assert.equal(audit().length, before.rows);
});

test('a password below the floor is refused naming the field', async () => {
  const { admin, agent, hashOf } = await start();
  const before = hashOf(agent.id);

  for (const password of [undefined, null, '', 'short', 'x'.repeat(MIN_PASSWORD_LENGTH - 1), 42]) {
    const res = await admin(`/api/v1/accounts/${agent.id}/set-password`, {
      method: 'POST',
      body: { password },
    });
    assert.equal(res.status, 422, `password ${JSON.stringify(password)} should be refused`);
    assert.deepEqual((await res.json()).fields, ['password']);
  }
  // Exactly the floor is accepted: the rule is a minimum, not a preference.
  assert.equal(
    (await admin(`/api/v1/accounts/${agent.id}/set-password`, {
      method: 'POST',
      body: { password: 'x'.repeat(MIN_PASSWORD_LENGTH) },
    })).status,
    200,
  );
  assert.notEqual(hashOf(agent.id), before);
});

test('an account nobody has is 404, and writes nothing', async () => {
  const { admin, audit } = await start();
  const before = audit().length;

  assert.equal(
    (await admin('/api/v1/accounts/no-such-user/set-password', {
      method: 'POST',
      body: { password: NEW_PASSWORD },
    })).status,
    404,
  );
  assert.equal(audit().length, before);
});

test('the floor applies where a password is chosen, not where one is presented', () => {
  // Asserted on the two rules rather than through a sign-in, because the only
  // way to store a password below the floor is to bypass the rule that
  // forbids it — and a test that had to do that would be testing its own
  // workaround.
  //
  // A floor at sign-in would refuse an account whose password predates the
  // rule, and would tell whoever typed it something about the stored value.
  assert.deepEqual(validateCredentials({ email: 'a@b.co', password: 'ab' }), []);
  assert.deepEqual(validateNewPassword({ password: 'ab' }), ['password']);
  // And an empty one is refused at both, for different reasons: nothing to
  // check against, and nothing to store.
  assert.deepEqual(validateCredentials({ email: 'a@b.co', password: '' }), ['password']);
  assert.deepEqual(validateNewPassword({ password: '' }), ['password']);
});
