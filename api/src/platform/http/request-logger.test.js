// Proves the last two criteria of scripts/criteria/platform.md section
// PLATFORM-6-API: the logged path is the one the client asked for, and the
// line carries the request id the client was given.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../app.js';

const servers = [];
after(() => servers.forEach((s) => s.close()));

function startLogging(mountTestRoutes) {
  const lines = [];
  const app = createApp({ mountTestRoutes, logger: { write: (line) => lines.push(JSON.parse(line)) } });
  const server = app.listen(0);
  servers.push(server);
  return { url: `http://127.0.0.1:${server.address().port}`, lines };
}

test('the logged path is the one the client asked for, not the router-relative one', async () => {
  const { url, lines } = startLogging();
  await fetch(`${url}/api/v1/health`);
  assert.equal(lines.length, 1);
  // Express restores req.url after the router unwinds; reading it here would
  // log "/health" and quietly mislead whoever traced the request.
  assert.equal(lines[0].path, '/api/v1/health');
  assert.equal(lines[0].method, 'GET');
  assert.equal(lines[0].status, 200);
  assert.ok(Number.isInteger(lines[0].durationMs));
});

test('the log line carries the request id the client was given', async () => {
  const { url, lines } = startLogging();
  const res = await fetch(`${url}/api/v1/health`, { headers: { 'X-Request-Id': 'trace-log' } });
  assert.equal(res.headers.get('x-request-id'), 'trace-log');
  assert.equal(lines[0].requestId, 'trace-log');
});

test('an off-prefix miss is logged once, with its status and its path', async () => {
  const { url, lines } = startLogging();
  await fetch(`${url}/users`);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].path, '/users');
  assert.equal(lines[0].status, 404);
});

test('a handler that throws is logged once, as a 500', async () => {
  const { url, lines } = startLogging((v1) =>
    v1.get('/boom', () => {
      throw new Error('nope');
    }),
  );
  await fetch(`${url}/api/v1/boom`);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].status, 500);
});
