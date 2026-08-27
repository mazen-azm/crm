// Proves scripts/criteria/platform.md lines 48-49 and 56-57 at the unit
// level: the body carries a code and a request id and nothing else, and this
// handler is the one place a status is decided. No server: the handler is a
// plain function, so two stubs are the whole harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HttpError, errorHandler } from './errors.js';

function stubRes() {
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

test('HttpError carries status and code', () => {
  const err = new HttpError(409, 'REVISION_MISMATCH');
  assert.equal(err.status, 409);
  assert.equal(err.code, 'REVISION_MISMATCH');
  assert.ok(err instanceof Error);
});

test('errorHandler emits { code, requestId } with the expected status', () => {
  const handle = errorHandler();
  const req = { id: 'req-1' };

  const plain = stubRes();
  handle(new Error('boom'), req, plain, () => {});
  assert.equal(plain.statusCode, 500);
  assert.deepEqual(plain.body, { code: 'INTERNAL', requestId: 'req-1' });

  const known = stubRes();
  handle(new HttpError(404, 'NOT_FOUND'), req, known, () => {});
  assert.equal(known.statusCode, 404);
  assert.deepEqual(known.body, { code: 'NOT_FOUND', requestId: 'req-1' });
});

test('errorHandler emits no stack, message, cause, or errno', () => {
  const handle = errorHandler();
  for (const err of [new Error('secret'), new HttpError(404, 'NOT_FOUND')]) {
    const res = stubRes();
    handle(err, { id: 'req-1' }, res, () => {});
    assert.deepEqual(Object.keys(res.body).sort(), ['code', 'requestId']);
  }
});

test('errorHandler delegates when headers are already sent', () => {
  const handle = errorHandler();
  const res = stubRes();
  res.headersSent = true;
  let delegated = null;
  const err = new Error('late');
  handle(err, { id: 'req-1' }, res, (e) => {
    delegated = e;
  });
  assert.equal(delegated, err);
  assert.equal(res.body, null);
});
