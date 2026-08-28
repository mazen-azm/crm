// Proves scripts/criteria/identity.md section IDENTITY-1-API end to end: the
// seeded admin can sign in, every refusal looks the same, and a token the API
// issued resolves a subject while anything else resolves nothing.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { signToken } from './identity.rules.js';

const SECRET = 'identity-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

function start({ now } = {}) {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now }).listen(0);
  servers.push(server);
  return { url: `http://127.0.0.1:${server.address().port}`, adminEmail, adminPassword, db };
}

const post = (url, body) =>
  fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('the seeded admin signs in and is given a token and their public fields', async () => {
  const { url, adminEmail, adminPassword } = start();
  const res = await post(url, { email: adminEmail, password: adminPassword });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['token', 'user']);
  assert.deepEqual(Object.keys(body.user).sort(), ['id', 'name', 'role']);
  assert.equal(body.user.role, 'admin');
  assert.ok(body.token.includes('.'));
  // Nothing about the password may travel, in any field.
  assert.ok(!JSON.stringify(body).includes('password_hash'));
});

test('an address is not case sensitive, because the column is not', async () => {
  const { url, adminEmail, adminPassword } = start();
  const res = await post(url, { email: adminEmail.toUpperCase(), password: adminPassword });
  assert.equal(res.status, 200);
});

test('a wrong password and an unknown address answer identically', async () => {
  const { url, adminEmail } = start();

  const wrong = await post(url, { email: adminEmail, password: 'not the password' });
  const unknown = await post(url, { email: 'nobody@support-desk.local', password: 'anything' });

  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  const [a, b] = [await wrong.json(), await unknown.json()];
  assert.equal(a.code, 'UNAUTHENTICATED');
  // Same code, same keys: the response is not a directory of who works here.
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
  assert.equal(a.code, b.code);
});

test('a soft-deleted account cannot sign in, with the right password', async () => {
  const { url, db, adminEmail, adminPassword } = start();
  db.prepare('UPDATE users SET deleted_at = ? WHERE email = ?').run('2026-08-28', adminEmail);

  const res = await post(url, { email: adminEmail, password: adminPassword });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, 'UNAUTHENTICATED');
});

test('a body of the wrong shape is 422 naming the fields, never their values', async () => {
  const { url } = start();
  const res = await post(url, { email: 'not-an-address', password: '' });

  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.code, 'VALIDATION_FAILED');
  assert.deepEqual(body.fields, ['email', 'password']);
  assert.ok(!JSON.stringify(body).includes('not-an-address'));
});

test('a malformed body is 400, not 401 — the request failed, not the credential', async () => {
  const { url } = start();
  const res = await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not json',
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, 'MALFORMED_BODY');
});

test('the token the API issued resolves a subject on a guarded route', async () => {
  const { url, adminEmail, adminPassword } = start();
  const { token, user } = await (await post(url, { email: adminEmail, password: adminPassword })).json();

  const me = await fetch(`${url}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), user);
});

test('no token, a tampered one, and a foreign-signed one are all 401', async () => {
  const { url, adminEmail, adminPassword } = start();
  const { token } = await (await post(url, { email: adminEmail, password: adminPassword })).json();

  const cases = {
    absent: undefined,
    garbage: 'Bearer not-a-token',
    tampered: `Bearer ${token.slice(0, -2)}xx`,
    foreign: `Bearer ${signToken({ sub: 'x', role: 'admin', exp: 9_999_999_999 }, 'a different secret')}`,
    wrongScheme: `Bearer  ${token}`,
  };

  for (const [name, header] of Object.entries(cases)) {
    const res = await fetch(`${url}/api/v1/me`, header ? { headers: { Authorization: header } } : {});
    assert.equal(res.status, 401, `${name} should be refused`);
    assert.equal((await res.json()).code, 'UNAUTHENTICATED');
  }
});

test('an expired token is refused', async () => {
  let clock = 1_000_000;
  const { url, adminEmail, adminPassword } = start({ now: () => clock });
  const { token } = await (await post(url, { email: adminEmail, password: adminPassword })).json();

  assert.equal((await fetch(`${url}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } })).status, 200);

  clock += 60 * 60 * 9;   // eight-hour session, nine hours later
  const after = await fetch(`${url}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(after.status, 401);
});

test('a token outlives its account by nothing at all', async () => {
  const { url, db, adminEmail, adminPassword } = start();
  const { token } = await (await post(url, { email: adminEmail, password: adminPassword })).json();

  db.prepare('UPDATE users SET deleted_at = ? WHERE email = ?').run('2026-08-28', adminEmail);

  const res = await fetch(`${url}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 401);
});

// --- IDENTITY-4-API (CRM-47): failed sign-ins are throttled ------------------

test('repeated wrong passwords throttle the account, even once the password is right', async () => {
  const { url, adminEmail, adminPassword } = start();

  for (let i = 0; i < 5; i += 1) {
    assert.equal((await post(url, { email: adminEmail, password: 'wrong' })).status, 401);
  }

  // The right password now. The throttle sits in front of the credential
  // check, so knowing it does not buy a way past the ceiling.
  const res = await post(url, { email: adminEmail, password: adminPassword });
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.code, 'RATE_LIMITED');
  assert.deepEqual(Object.keys(body).sort(), ['code', 'requestId']);
});

test('one host failing many accounts is throttled on the address alone', async () => {
  const { url } = start();

  // Twenty distinct unknown accounts, one failure each: every account stays at
  // one, well under its own ceiling of five, so only the address counter can
  // be what refuses the twenty-first.
  for (let i = 0; i < 20; i += 1) {
    assert.equal((await post(url, { email: `u${i}@support-desk.local`, password: 'wrong' })).status, 401);
  }

  const res = await post(url, { email: 'fresh@support-desk.local', password: 'wrong' });
  assert.equal(res.status, 429);
  assert.equal((await res.json()).code, 'RATE_LIMITED');
});

test('the throttled answer keeps the 401 silence', async () => {
  const { url, adminEmail } = start();
  const known = await post(url, { email: adminEmail, password: 'wrong' });
  const knownBody = await known.json();

  for (let i = 0; i < 5; i += 1) await post(url, { email: 'ghost@support-desk.local', password: 'wrong' });
  const throttled = await post(url, { email: 'ghost@support-desk.local', password: 'wrong' });
  // Without this the test compares a 401 to a 401 and passes with no throttle
  // in the codebase at all.
  assert.equal(throttled.status, 429);
  const throttledBody = await throttled.json();

  // Same keys as the 401, and nothing that says whether the account is real.
  assert.deepEqual(Object.keys(throttledBody).sort(), Object.keys(knownBody).sort());
  assert.equal(throttledBody.fields, undefined);
  assert.ok(!JSON.stringify(throttledBody).includes('ghost@support-desk.local'));
});

test('the window elapses by the clock, with nothing sweeping it', async () => {
  let time = 1_000_000;
  const { url, adminEmail, adminPassword } = start({ now: () => time });

  for (let i = 0; i < 5; i += 1) await post(url, { email: adminEmail, password: 'wrong' });
  assert.equal((await post(url, { email: adminEmail, password: adminPassword })).status, 429);

  time += 15 * 60 + 1;
  assert.equal((await post(url, { email: adminEmail, password: adminPassword })).status, 200);
});

test('a success clears the account counter for the next round of mistyping', async () => {
  const { url, adminEmail, adminPassword } = start();

  for (let i = 0; i < 4; i += 1) await post(url, { email: adminEmail, password: 'wrong' });
  assert.equal((await post(url, { email: adminEmail, password: adminPassword })).status, 200);

  // Four more. Without the reset that would be eight, past the ceiling of five.
  for (let i = 0; i < 4; i += 1) {
    assert.equal((await post(url, { email: adminEmail, password: 'wrong' })).status, 401);
  }

  // The contrast is the test. On a second app with no success in the middle,
  // the same eight failures do trip the ceiling — otherwise the assertions
  // above are equally true of a codebase with no throttle in it.
  const other = start();
  for (let i = 0; i < 8; i += 1) await post(other.url, { email: other.adminEmail, password: 'wrong' });
  assert.equal((await post(other.url, { email: other.adminEmail, password: other.adminPassword })).status, 429);
});

test('a malformed body cannot be used to flood the counters', async () => {
  const { url, adminEmail, adminPassword } = start();

  // Ten 422s. The throttle sits behind the shape check, so none of them count.
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await post(url, { email: 123, password: null })).status, 422);
  }
  assert.equal((await post(url, { email: adminEmail, password: adminPassword })).status, 200);
});
