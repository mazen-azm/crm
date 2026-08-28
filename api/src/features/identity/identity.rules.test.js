import { test } from 'node:test';
import assert from 'node:assert/strict';

import { signToken, verifyToken, validateCredentials, TOKEN_TTL_SECONDS } from './identity.rules.js';

const SECRET = 'a secret';
const claims = { sub: 'u1', role: 'admin', exp: 9_999_999_999 };

test('a token this secret signed reads back as its claims', () => {
  assert.deepEqual(verifyToken(signToken(claims, SECRET), SECRET), claims);
});

test('every way a token can be wrong returns null, and none of them throws', () => {
  const token = signToken(claims, SECRET);
  const wrong = [
    undefined, null, 42, '', 'no-dot',
    'a.b.c',
    `${token}x`,
    token.replace('.', '.x'),
    signToken(claims, 'another secret'),
    signToken({ ...claims, exp: 1 }, SECRET),
    `${Buffer.from('not json').toString('base64url')}.${'x'.repeat(43)}`,
  ];
  for (const raw of wrong) assert.equal(verifyToken(raw, SECRET), null, `${raw} should not verify`);
});

test('a token carries no algorithm, so nothing can tell it which one to trust', () => {
  const [payload] = signToken(claims, SECRET).split('.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  assert.deepEqual(Object.keys(decoded).sort(), ['exp', 'role', 'sub']);
});

test('expiry is read against the clock it is given', () => {
  const token = signToken({ ...claims, exp: 100 }, SECRET);
  assert.ok(verifyToken(token, SECRET, { now: () => 99 }));
  assert.equal(verifyToken(token, SECRET, { now: () => 100 }), null);
});

test('the session is eight hours', () => {
  assert.equal(TOKEN_TTL_SECONDS, 60 * 60 * 8);
});

test('validation names every field that is wrong, and only those', () => {
  assert.deepEqual(validateCredentials({ email: 'a@b', password: 'x' }), []);
  assert.deepEqual(validateCredentials({ email: 'nope', password: 'x' }), ['email']);
  assert.deepEqual(validateCredentials({}), ['email', 'password']);
  assert.deepEqual(validateCredentials({ email: `${'a'.repeat(255)}@b`, password: 'x' }), ['email']);
});
