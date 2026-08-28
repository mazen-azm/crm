// Proves scripts/criteria/platform.md lines 58-59: the standard security set
// is present on the response — each header by name, not "some headers exist".
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../app.js';

const EXPECTED = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'permissions-policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
};

const servers = [];
after(() => servers.forEach((s) => s.close()));

function start() {
  const app = createApp({
    mountTestRoutes: (a) => a.get('/ok', (req, res) => res.json({})),
  });
  const server = app.listen(0);
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

test('sets the standard set of security headers on every response', async () => {
  const res = await fetch(`${start()}/api/v1/ok`);
  for (const [name, value] of Object.entries(EXPECTED)) {
    assert.equal(res.headers.get(name), value, `missing or wrong: ${name}`);
  }
});

test('does not send X-Powered-By', async () => {
  const res = await fetch(`${start()}/api/v1/ok`);
  assert.equal(res.headers.get('x-powered-by'), null);
});
