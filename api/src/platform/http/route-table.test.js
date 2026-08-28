// The walker is the half of the contract test that reads reality. If it is
// wrong, the contract test is comparing the document against a fiction.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../app.js';
import { collectRoutes } from './route-table.js';
import { API_V1_PREFIX } from './prefix.js';

test('the walker and the prefix agree on what is served', () => {
  const served = collectRoutes(createApp(), API_V1_PREFIX);
  assert.deepEqual(served, ['GET /api/v1/health', 'GET /api/v1/openapi.json']);
});

test('a route mounted through the seam is seen, with its method', () => {
  const served = collectRoutes(
    createApp({ mountTestRoutes: (v1) => v1.post('/x', (req, res) => res.json({})) }),
    API_V1_PREFIX,
  );
  assert.ok(served.includes('POST /api/v1/x'), served.join(', '));
});

test('a route registered for several methods yields one entry each', () => {
  const served = collectRoutes(
    createApp({
      mountTestRoutes: (v1) => {
        v1.get('/z', (req, res) => res.json({}));
        v1.put('/z', (req, res) => res.json({}));
      },
    }),
    API_V1_PREFIX,
  );
  assert.ok(served.includes('GET /api/v1/z'));
  assert.ok(served.includes('PUT /api/v1/z'));
});

test('the result is sorted, so a difference names offenders in a stable order', () => {
  const served = collectRoutes(createApp(), API_V1_PREFIX);
  assert.deepEqual(served, [...served].sort());
});
