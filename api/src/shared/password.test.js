import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from './password.js';

test('a password verifies against its own hash and nothing else', () => {
  const stored = hashPassword('correct horse');
  assert.equal(verifyPassword('correct horse', stored), true);
  assert.equal(verifyPassword('correct hors', stored), false);
  assert.equal(verifyPassword('', stored), false);
});

test('the same password hashes differently every time, because of the salt', () => {
  assert.notEqual(hashPassword('same'), hashPassword('same'));
});

test('a malformed stored value is a refusal, never an exception', () => {
  for (const stored of ['', 'no-colon', 'zz:zz', 'abc:', ':abc', null, undefined, 42]) {
    assert.equal(verifyPassword('anything', stored), false, `${stored} should refuse`);
  }
});

test('the dummy hash is a real hash that no real password matches', () => {
  assert.match(DUMMY_PASSWORD_HASH, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword('password', DUMMY_PASSWORD_HASH), false);
});
