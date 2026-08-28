// Proves scripts/criteria/platform.md lines 48-49 and 56-57 at the unit
// level: the body carries a code and a request id and nothing else, and this
// handler is the one place a status is decided. No server: the handler is a
// plain function, so two stubs are the whole harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  HttpError,
  ValidationError,
  DOCUMENTED,
  unprocessable,
  errorHandler,
} from './errors.js';

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

test('the constructor refuses a status outside the documented catalogue', () => {
  assert.throws(() => new HttpError(418, 'TEAPOT'), RangeError);
  // 501 belongs to rule E-3 and joins the catalogue in CHANNELS-2-API.
  assert.throws(() => new HttpError(501, 'NOT_IMPLEMENTED'), RangeError);
  assert.doesNotThrow(() => new HttpError(429, 'RATE_LIMITED'));
});

test('a domain code at a documented status still constructs', () => {
  const err = new HttpError(409, 'REVISION_MISMATCH');
  assert.equal(err.status, 409);
  assert.equal(err.code, 'REVISION_MISMATCH');
});

test('DOCUMENTED is exactly the eight statuses of rule E-2, and frozen', () => {
  assert.deepEqual(
    Object.keys(DOCUMENTED).map(Number).sort((a, b) => a - b),
    [400, 401, 403, 404, 409, 422, 429, 500],
  );
  assert.ok(Object.isFrozen(DOCUMENTED));
});

test('unprocessable() carries 422, its code, and the field names', () => {
  const err = unprocessable(['email']);
  assert.ok(err instanceof HttpError);
  assert.ok(err instanceof ValidationError);
  assert.equal(err.status, 422);
  assert.equal(err.code, 'VALIDATION_FAILED');
  assert.deepEqual(err.fields, ['email']);
});

test('unprocessable() keeps names and drops anything that could be a value', () => {
  assert.deepEqual(unprocessable(['email', 42, { field: 'name' }]).fields, ['email']);
  assert.deepEqual(unprocessable('not-a-list').fields, []);
});

test('errorHandler serialises fields on a 422', () => {
  const res = stubRes();
  errorHandler()(unprocessable(['email']), { id: 'req-1' }, res, () => {});
  assert.equal(res.statusCode, 422);
  assert.deepEqual(Object.keys(res.body).sort(), ['code', 'fields', 'requestId']);
  assert.deepEqual(res.body.fields, ['email']);
});

test('errorHandler omits fields when the list is empty', () => {
  const res = stubRes();
  errorHandler()(unprocessable([]), { id: 'req-1' }, res, () => {});
  assert.equal(res.statusCode, 422);
  assert.deepEqual(Object.keys(res.body).sort(), ['code', 'requestId']);
});
