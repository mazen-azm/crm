// Proves scripts/criteria/identity.md section IDENTITY-8-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { signToken, TOKEN_TTL_SECONDS } from './identity.rules.js';

const SECRET = 'session-invalidation-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// A clock the test moves, because "before the change" and "after it" are a
// second apart and nothing here should wait for one.
const movable = (from = 1_800_000_000) => {
  let at = from;
  const now = () => at;
  now.tick = (seconds = 1) => { at += seconds; };
  return now;
};

async function start(now = movable()) {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = (email, password) =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const tokenFor = async (email, password) => (await (await signIn(email, password)).json()).token;

  const as = (tok) => (path, init = {}) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  const change = (tok, body) => as(tok)('/api/v1/me/password', { method: 'POST', body });
  const whoAmI = (tok) => as(tok)('/api/v1/me');
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, url, now, signIn, tokenFor, as, change, whoAmI, audit, adminEmail, adminPassword };
}

test('a session on another device stops when the password changes', async () => {
  const now = movable();
  const { tokenFor, change, whoAmI, adminEmail, adminPassword } = await start(now);

  const laptop = await tokenFor(adminEmail, adminPassword);
  const phone = await tokenFor(adminEmail, adminPassword);
  assert.equal((await whoAmI(phone)).status, 200, 'both are signed in to begin with');

  now.tick();
  const res = await change(laptop, { currentPassword: adminPassword, newPassword: 'a-much-better-one' });
  assert.equal(res.status, 200);

  // The other device is out. Until this story a changed password left every
  // token it was issued under working until it expired — eight hours in which
  // whoever the password was changed BECAUSE of stayed signed in.
  assert.equal((await whoAmI(phone)).status, 401);
});

test('the device that made the change stays signed in, through the token it was given', async () => {
  const now = movable();
  const { tokenFor, change, whoAmI, adminEmail, adminPassword } = await start(now);
  const laptop = await tokenFor(adminEmail, adminPassword);

  now.tick();
  const { token } = await (await change(laptop, {
    currentPassword: adminPassword,
    newPassword: 'a-much-better-one',
  })).json();

  // The token that made the request is dead too — it was issued under the old
  // password, and no rule could spare it that would not also spare the phone.
  assert.equal((await whoAmI(laptop)).status, 401);
  // So the answer carries its replacement, and the session continues.
  assert.ok(token);
  assert.equal((await whoAmI(token)).status, 200);
});

test('a token issued in the same second as the change is accepted, and that is the known limit', async () => {
  const now = movable();
  const { tokenFor, change, whoAmI, adminEmail, adminPassword } = await start(now);
  const laptop = await tokenFor(adminEmail, adminPassword);
  // No tick: this one is minted in the very second the change will happen.
  const sameSecond = await tokenFor(adminEmail, adminPassword);

  await change(laptop, { currentPassword: adminPassword, newPassword: 'a-much-better-one' });

  // Accepted. The comparison is `iat >= password_changed_at`, and it has to
  // be: the fresh token the change answers with carries that very second, so
  // `>` would sign out the one session that must survive.
  //
  // The cost is a one-second window in which another device's token also
  // survives. Nothing in the token distinguishes them, because a second is the
  // finest thing this clock measures — the same whole-second limit that shows
  // up in the message thread's ordering.
  //
  // Pinned here so it is a known limit rather than a surprise. If it ever
  // matters, the fix is a token identity, not a finer clock.
  assert.equal((await whoAmI(sameSecond)).status, 200);
});

test('an admin setting somebody else’s password ends their sessions too', async () => {
  const now = movable();
  const { tokenFor, as, whoAmI, adminEmail, adminPassword } = await start(now);
  const admin = as(await tokenFor(adminEmail, adminPassword));

  const made = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'an-agent@support-desk.local', name: 'An Agent', role: 'agent' },
  })).json();
  const theirs = await tokenFor(made.user.email, made.initialPassword);
  assert.equal((await whoAmI(theirs)).status, 200);

  now.tick();
  await admin(`/api/v1/accounts/${made.user.id}/set-password`, {
    method: 'POST',
    body: { password: 'set-by-an-admin-today' },
  });

  // The reason to end them is that the old password may be known to somebody
  // else — which is more true here, not less: an admin sets a password when
  // somebody is locked out, and being locked out is what happens after
  // somebody else has been in.
  assert.equal((await whoAmI(theirs)).status, 401);
});

test('the refusal is the one a forged token gets, and says nothing about having been valid', async () => {
  const now = movable();
  const { tokenFor, change, whoAmI, adminEmail, adminPassword } = await start(now);
  const phone = await tokenFor(adminEmail, adminPassword);
  now.tick();
  await change(await tokenFor(adminEmail, adminPassword), {
    currentPassword: adminPassword, newPassword: 'a-much-better-one',
  });

  const ended = await whoAmI(phone);
  const forged = await whoAmI(signToken({ sub: 'nobody', role: 'admin', exp: 9_999_999_999, iat: 0 }, 'wrong-secret'));

  assert.equal(ended.status, 401);
  assert.equal(forged.status, 401);
  const [a, b] = [await ended.json(), await forged.json()];
  // That a token was once valid is not something the refusal should say.
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('ending the sessions writes no audit row of its own', async () => {
  const now = movable();
  const { tokenFor, change, audit, adminEmail, adminPassword } = await start(now);
  const laptop = await tokenFor(adminEmail, adminPassword);
  const before = audit().length;

  now.tick();
  await change(laptop, { currentPassword: adminPassword, newPassword: 'a-much-better-one' });

  // One row: the password change. Ending the sessions is part of changing the
  // password, not a separate act somebody performed.
  const written = audit().slice(before);
  assert.equal(written.length, 1);
  assert.equal(written[0].verb, 'user.change-own-password');
});

test('an account that has never changed its password keeps the tokens it was given', async () => {
  const now = movable();
  const { tokenFor, whoAmI, adminEmail, adminPassword } = await start(now);

  // The column defaults to 0 rather than the current time. Backfilling with
  // `now` would have signed out everybody the moment the migration ran.
  const token = await tokenFor(adminEmail, adminPassword);
  now.tick(60 * 60);
  assert.equal((await whoAmI(token)).status, 200);
});

test('a token with no issue time is refused once the password has changed', async () => {
  const now = movable();
  const { db, tokenFor, change, whoAmI, adminEmail, adminPassword } = await start(now);
  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);

  now.tick();
  await change(await tokenFor(adminEmail, adminPassword), {
    currentPassword: adminPassword, newPassword: 'a-much-better-one',
  });

  // A token minted before this story shipped carries no `iat`. Treated as
  // issued at 0 — refused once anything has changed, kept while nothing has.
  // The safe direction: an old token surviving a password change is the bug
  // this story exists to fix.
  const old = signToken({ sub: admin.id, role: 'admin', exp: now() + TOKEN_TTL_SECONDS }, SECRET);
  assert.equal((await whoAmI(old)).status, 401);
});
