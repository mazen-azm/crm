// Proves the first half of scripts/criteria/platform.md line 276: a malformed
// body is 400, not 500. The middleware is a plain function, so a stub error
// and a captured next() are the whole harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HttpError } from './errors.js';
import { jsonBodyErrors } from './json-errors.js';

function capture() {
  const calls = [];
  return { calls, next: (...args) => calls.push(args) };
}

test('a parse failure becomes 400 MALFORMED_BODY, keeping the cause', () => {
  const parse = Object.assign(new SyntaxError('bad'), {
    type: 'entity.parse.failed',
    status: 400,
  });
  const { calls, next } = capture();
  jsonBodyErrors()(parse, {}, {}, next);
  const err = calls[0][0];
  assert.ok(err instanceof HttpError);
  assert.equal(err.status, 400);
  assert.equal(err.code, 'MALFORMED_BODY');
  assert.equal(err.cause, parse);
});

test('an oversized body passes through untouched — 413 is not this story', () => {
  const tooLarge = { type: 'entity.too.large', status: 413 };
  const { calls, next } = capture();
  jsonBodyErrors()(tooLarge, {}, {}, next);
  assert.equal(calls[0][0], tooLarge);
});

test('an unrelated error passes through untouched', () => {
  const other = new Error('unrelated');
  const { calls, next } = capture();
  jsonBodyErrors()(other, {}, {}, next);
  assert.equal(calls[0][0], other);
});
