// Proves scripts/criteria/platform.md lines 52-55: a request with no id gets
// one, returned in the headers; a request that carries an id keeps it.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../app.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const servers = [];
after(() => servers.forEach((s) => s.close()));

function start(mountTestRoutes) {
  const app = createApp({ mountTestRoutes });
  const server = app.listen(0);
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

const probe = (app) => app.get('/probe', (req, res) => res.json({ id: req.id }));

test('generates a UUID when no header is present, echoes it in the response', async () => {
  const url = start(probe);
  const res = await fetch(`${url}/probe`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('x-request-id'), UUID);
});

test('echoes an accepted incoming X-Request-Id', async () => {
  const url = start(probe);
  const res = await fetch(`${url}/probe`, {
    headers: { 'X-Request-Id': 'abc.123_ok-42' },
  });
  assert.equal(res.headers.get('x-request-id'), 'abc.123_ok-42');
  assert.deepEqual(await res.json(), { id: 'abc.123_ok-42' });
});

test('replaces a malformed X-Request-Id with a fresh UUID', async () => {
  const url = start(probe);
  const res = await fetch(`${url}/probe`, {
    headers: { 'X-Request-Id': 'has spaces in it' },
  });
  assert.match(res.headers.get('x-request-id'), UUID);
});

test('replaces an overlong X-Request-Id with a fresh UUID', async () => {
  const url = start(probe);
  const res = await fetch(`${url}/probe`, {
    headers: { 'X-Request-Id': 'a'.repeat(201) },
  });
  assert.match(res.headers.get('x-request-id'), UUID);
});
