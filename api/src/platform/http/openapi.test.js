// The contract is fetchable from the running application, and it lists
// itself — the entry that proves the served tree and the document agree.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../app.js';

const servers = [];
after(() => servers.forEach((s) => s.close()));

function start() {
  const server = createApp().listen(0);
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

test('the running application serves its own contract', async () => {
  const res = await fetch(`${start()}/api/v1/openapi.json`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^application\/json/);
  const doc = await res.json();
  assert.equal(doc.openapi, '3.1.0');
  assert.ok(doc.paths['/api/v1/openapi.json'], 'the document does not list itself');
});
