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
