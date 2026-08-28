// The fourth criterion of scripts/criteria/platform.md section
// PLATFORM-7-API: every request in the collection resolves against the
// running application. Not a Postman export — an executable smoke list that
// feature stories append to as they add routes.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createApp } from '../../app.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COLLECTION = JSON.parse(readFileSync(path.resolve(HERE, '../../../requests.json'), 'utf8'));

const servers = [];
after(() => servers.forEach((s) => s.close()));

test('every request in the collection resolves against the application', async () => {
  const server = createApp().listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  assert.ok(COLLECTION.requests.length > 0, 'the collection is empty');
  for (const request of COLLECTION.requests) {
    const res = await fetch(`${url}${request.path}`, { method: request.method });
    assert.notEqual(res.status, 404, `"${request.name}" (${request.method} ${request.path}) is not served`);
    assert.ok(res.status < 500, `"${request.name}" answered ${res.status}`);
  }
});
