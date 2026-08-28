// Proves scripts/criteria/platform.md lines 48-51 and 56-57 end to end: an
// unknown route and a thrown error wear the same documented shape, decided by
// one middleware, with the request id on both paths.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from './app.js';
import { HttpError, unprocessable } from './platform/http/errors.js';
import { requireSubject, requirePermission } from './platform/http/permission.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const servers = [];
after(() => servers.forEach((s) => s.close()));

function start(mountTestRoutes, subjectResolver) {
  const app = createApp({ mountTestRoutes, subjectResolver });
  const server = app.listen(0);
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

test('unknown route returns the documented error shape with status 404', async () => {
  const res = await fetch(`${start()}/api/v1/nope`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['code', 'requestId']);
  assert.equal(body.code, 'NOT_FOUND');
  assert.match(body.requestId, UUID);
});

test('a synchronous throw in a route becomes 500 with { code: INTERNAL }', async () => {
  const url = start((app) =>
    app.get('/boom', () => {
      throw new Error('nope');
    }),
  );
  const res = await fetch(`${url}/api/v1/boom`);
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['code', 'requestId']);
  assert.equal(body.code, 'INTERNAL');
});

test('an async rejection in a route becomes 500 with { code: INTERNAL }', async () => {
  const url = start((app) =>
    app.get('/boom', async () => {
      throw new Error('nope');
    }),
  );
  const res = await fetch(`${url}/api/v1/boom`);
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['code', 'requestId']);
  assert.equal(body.code, 'INTERNAL');
});

test('an HttpError from a route uses its status and code', async () => {
  const url = start((app) =>
    app.get('/conflict', () => {
      throw new HttpError(409, 'REVISION_MISMATCH');
    }),
  );
  const res = await fetch(`${url}/api/v1/conflict`);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REVISION_MISMATCH');
});

test('the response carries the request id set by the middleware', async () => {
  const url = start((app) => app.get('/ok', (req, res) => res.json({})));

  const ok = await fetch(`${url}/api/v1/ok`, { headers: { 'X-Request-Id': 'trace-1' } });
  assert.equal(ok.headers.get('x-request-id'), 'trace-1');

  const err = await fetch(`${url}/api/v1/nope`, { headers: { 'X-Request-Id': 'trace-2' } });
  assert.equal(err.headers.get('x-request-id'), 'trace-2');
  assert.equal((await err.json()).requestId, 'trace-2');
});

test('a route guarded by requireSubject() returns 401 when no resolver is wired', async () => {
  let handlerRan = false;
  const url = start((app) =>
    app.get('/private', requireSubject(), (req, res) => {
      handlerRan = true;
      res.json({ ok: true });
    }),
  );
  const res = await fetch(`${url}/api/v1/private`);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, 'UNAUTHENTICATED');
  assert.match(body.requestId, UUID);
  assert.equal(handlerRan, false);
});

test('a route guarded by requirePermission(deny) returns 403 and never calls the service', async () => {
  const url = start(
    (app) =>
      app.get('/private', requirePermission(() => false), () => {
        throw new Error('service must not run');
      }),
    async () => ({ id: 'u1' }),
  );
  const res = await fetch(`${url}/api/v1/private`);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'FORBIDDEN');
});

test('a route guarded by requirePermission(allow) reaches the service and returns 200', async () => {
  const url = start(
    (app) =>
      app.get('/private', requirePermission((s) => s.id === 'u1'), (req, res) =>
        res.json({ hello: req.subject.id }),
      ),
    async () => ({ id: 'u1' }),
  );
  const res = await fetch(`${url}/api/v1/private`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { hello: 'u1' });
});

test('the request id on a 401/403 from the permission chain is the one the client supplied', async () => {
  const url = start((app) => app.get('/private', requireSubject(), (req, res) => res.json({})));
  const res = await fetch(`${url}/api/v1/private`, { headers: { 'X-Request-Id': 'trace-perm' } });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('x-request-id'), 'trace-perm');
  assert.equal((await res.json()).requestId, 'trace-perm');
});

const JSON_POST = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

test('a malformed JSON body returns 400 MALFORMED_BODY in the documented shape', async () => {
  const res = await fetch(`${start()}/api/v1/anything`, { ...JSON_POST, body: '{ not json' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['code', 'requestId']);
  assert.equal(body.code, 'MALFORMED_BODY');
  assert.match(body.requestId, UUID);
  assert.ok(res.headers.get('x-request-id'));
});

test('a well-formed JSON body still reaches the handler', async () => {
  const url = start((app) => app.post('/echo', (req, res) => res.json(req.body)));
  const res = await fetch(`${url}/api/v1/echo`, { ...JSON_POST, body: '{"a":1}' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { a: 1 });
});

test('a route that throws a ValidationError returns 422 with field names only', async () => {
  const url = start((app) =>
    app.get('/v', () => {
      throw unprocessable(['name', 'email']);
    }),
  );
  const res = await fetch(`${url}/api/v1/v`);
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.code, 'VALIDATION_FAILED');
  assert.deepEqual(body.fields, ['name', 'email']);
  assert.match(body.requestId, UUID);
});

test('the request id on a 400 malformed-body error is the client-supplied one', async () => {
  const res = await fetch(`${start()}/api/v1/anything`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'trace-body' },
    body: '{ not json',
  });
  assert.equal(res.headers.get('x-request-id'), 'trace-body');
  assert.equal((await res.json()).requestId, 'trace-body');
});

test('the health endpoint answers a stranger, and says nothing else', async () => {
  const res = await fetch(`${start()}/api/v1/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('a route called without the /api/v1 prefix is not found', async () => {
  const url = start((v1) => v1.get('/users', (req, res) => res.json([])));
  const off = await fetch(`${url}/users`);
  assert.equal(off.status, 404);
  const body = await off.json();
  assert.deepEqual(Object.keys(body).sort(), ['code', 'requestId']);
  assert.equal(body.code, 'NOT_FOUND');
  assert.match(body.requestId, UUID);

  // and the same path under the prefix is served
  assert.equal((await fetch(`${url}/api/v1/users`)).status, 200);
});
