// Proves BR-4 (scripts/rules.txt line 8) and the second criterion of
// scripts/criteria/platform.md section PLATFORM-6-API: a limit above the
// ceiling is refused, not clamped.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readPagination } from './pagination.js';
import { ValidationError } from './errors.js';

const req = (query) => ({ query });

test('an absent window is the default window', () => {
  assert.deepEqual(readPagination(req({})), { limit: 20, offset: 0 });
  assert.deepEqual(readPagination({}), { limit: 20, offset: 0 });
});

test('a valid window is parsed to integers', () => {
  assert.deepEqual(readPagination(req({ limit: '50', offset: '25' })), { limit: 50, offset: 25 });
});

test('a limit above the ceiling is refused, never clamped', () => {
  try {
    readPagination(req({ limit: '101' }));
    assert.fail('expected a refusal');
  } catch (err) {
    assert.ok(err instanceof ValidationError);
    assert.equal(err.status, 422);
    assert.equal(err.code, 'VALIDATION_FAILED');
    assert.deepEqual(err.fields, ['limit']);
  }
  // The ceiling itself is allowed — the refusal starts one above it.
  assert.deepEqual(readPagination(req({ limit: '100' })), { limit: 100, offset: 0 });
});

test('a limit that is not a positive integer is refused', () => {
  for (const limit of ['0', '-1', 'abc', '']) {
    assert.throws(() => readPagination(req({ limit })), (err) => {
      assert.deepEqual(err.fields, ['limit']);
      return true;
    }, `limit=${limit} should be refused`);
  }
});

test('an offset that is not a whole number is refused', () => {
  for (const offset of ['-1', 'xyz']) {
    assert.throws(() => readPagination(req({ offset })), (err) => {
      assert.deepEqual(err.fields, ['offset']);
      return true;
    }, `offset=${offset} should be refused`);
  }
  assert.deepEqual(readPagination(req({ offset: '0' })), { limit: 20, offset: 0 });
});
