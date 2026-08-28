// The headline of scripts/criteria/platform.md section PLATFORM-7-API: the
// document cannot drift, because the suite compares it to the router. Both
// directions fail, and each failure names the route rather than counting.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';

// The application as production composes it — the document describes what is
// served, so the check has to look at the same arrangement.
const createApp = (deps = {}) => {
  const db = openDatabase(':memory:');
  runMigrations(db);
  return composeApp({ db, secret: 'contract-test-secret', ...deps });
};
import { collectRoutes } from './route-table.js';
import { API_V1_PREFIX } from './prefix.js';
import { OPENAPI_DOCUMENT } from './openapi.js';
import { DOCUMENTED } from './errors.js';

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'];

// OpenAPI names a path parameter {id}; Express names it :id. Both describe the
// same route, so the comparison speaks one of them — the document keeps the
// standard spelling and the served table is translated into it.
const toOpenApiPath = (path) => path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

function documentedRoutes() {
  const out = [];
  for (const [path, operations] of Object.entries(OPENAPI_DOCUMENT.paths ?? {})) {
    for (const method of Object.keys(operations)) {
      if (METHODS.includes(method)) out.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return out.sort();
}

test('every served route appears in the document', () => {
  const documented = new Set(documentedRoutes());
  const missing = collectRoutes(createApp(), API_V1_PREFIX)
    .map(toOpenApiPath)
    .filter((r) => !documented.has(r));
  assert.deepEqual(missing, [], `served but not documented: ${missing.join(', ')}`);
});

test('every documented route is actually served', () => {
  const served = new Set(collectRoutes(createApp(), API_V1_PREFIX).map(toOpenApiPath));
  const stale = documentedRoutes().filter((r) => !served.has(r));
  assert.deepEqual(stale, [], `documented but not served: ${stale.join(', ')}`);
});

test('every documented status is one the API is allowed to answer', () => {
  const allowed = new Set(Object.keys(DOCUMENTED));
  for (const [path, operations] of Object.entries(OPENAPI_DOCUMENT.paths ?? {})) {
    for (const [method, operation] of Object.entries(operations)) {
      for (const status of Object.keys(operation.responses ?? {})) {
        // 2xx is a success the route decides; everything else must be one of
        // rule E-2's eight, which is what DOCUMENTED holds (L-11).
        const ok = /^2\d\d$/.test(status) || allowed.has(status);
        assert.ok(ok, `${method.toUpperCase()} ${path} documents ${status}, which rule E-2 does not allow`);
      }
    }
  }
});

test('every documented path is under the versioned prefix', () => {
  for (const path of Object.keys(OPENAPI_DOCUMENT.paths ?? {})) {
    assert.ok(path.startsWith(API_V1_PREFIX), `${path} is outside ${API_V1_PREFIX}`);
  }
});
