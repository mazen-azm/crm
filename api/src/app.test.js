// Proves scripts/criteria/platform.md lines 48-51 and 56-57 end to end: an
// unknown route and a thrown error wear the same documented shape, decided by
// one middleware, with the request id on both paths.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from './app.js';
import { HttpError } from './platform/http/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const servers = [];
after(() => servers.forEach((s) => s.close()));

function start(mountTestRoutes) {
  const app = createApp({ mountTestRoutes });
  const server = app.listen(0);
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

test('unknown route returns the documented error shape with status 404', async () => {
  const res = await fetch(`${start()}/nope`);
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
  const res = await fetch(`${url}/boom`);
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
  const res = await fetch(`${url}/boom`);
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
  const res = await fetch(`${url}/conflict`);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REVISION_MISMATCH');
});

test('the response carries the request id set by the middleware', async () => {
  const url = start((app) => app.get('/ok', (req, res) => res.json({})));

  const ok = await fetch(`${url}/ok`, { headers: { 'X-Request-Id': 'trace-1' } });
  assert.equal(ok.headers.get('x-request-id'), 'trace-1');

  const err = await fetch(`${url}/nope`, { headers: { 'X-Request-Id': 'trace-2' } });
  assert.equal(err.headers.get('x-request-id'), 'trace-2');
  assert.equal((await err.json()).requestId, 'trace-2');
});
