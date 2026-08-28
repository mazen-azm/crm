// Proves scripts/criteria/audit.md section AUDIT-1-API through the app itself:
// every mutating route the router serves writes exactly one audit row, a failed
// mutation leaves neither the change nor the row, and no diff carries a secret.
//
// The set of routes checked is DERIVED FROM THE ROUTER, not listed here (L-24).
// A hand-written list would rest on the memory of the next author — the same
// memory that would have forgotten the audit call in the first place.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { collectRoutes } from '../../platform/http/route-table.js';
import { API_V1_PREFIX } from '../../platform/http/prefix.js';
import { wrapDbWithAuditGuard } from './audit.guard.js';

const SECRET = 'audit-guarantee-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// Routes that change nothing. Everything else must be exercised below.
const READ_ONLY = new Set(['GET', 'HEAD', 'OPTIONS']);

// Mutating routes that deliberately write no audit row, each with the reason.
// A route may only be here on purpose — an entry is a decision, not a waiver.
const NOT_A_MUTATION = new Map([
  ['POST /api/v1/sign-in', 'signing in changes nothing; the throttle counters are in memory'],
]);

async function start() {
  const real = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(real);
  // The guard goes on AFTER the seed: seeding is a mutation with no actor and
  // no request, and it runs outside any transaction, where the guard is inert.
  const db = wrapDbWithAuditGuard(real);
  const app = composeApp({ db, secret: SECRET });
  const server = app.listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const { token } = await res.json();

  const call = (path, { method = 'GET', body, tok = token } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const auditCount = () => real.prepare('SELECT count(*) AS n FROM audit_events').get().n;
  return { app, real, call, auditCount };
}

// Every mutating route this file drives. Compared against the router below.
const EXERCISED = new Set([
  'POST /api/v1/accounts',
  'PATCH /api/v1/accounts/:id/role',
  'POST /api/v1/accounts/:id/disable',
  'POST /api/v1/accounts/:id/re-enable',
]);

test('every mutating route the router serves is exercised by this file', async () => {
  const { app } = await start();
  const mutating = collectRoutes(app, API_V1_PREFIX)
    .filter((entry) => !READ_ONLY.has(entry.split(' ')[0]))
    .filter((entry) => !NOT_A_MUTATION.has(entry));

  const uncovered = mutating.filter((entry) => !EXERCISED.has(entry));
  const stale = [...EXERCISED].filter((entry) => !mutating.includes(entry));

  assert.deepEqual(
    uncovered,
    [],
    `mutating route not exercised by the audit guarantee: ${uncovered.join(', ')}\n` +
      'Add it below and assert its audit row, or record it in NOT_A_MUTATION with a reason.',
  );
  assert.deepEqual(stale, [], `exercised route no longer served: ${stale.join(', ')}`);
});

test('each mutating route writes exactly one audit row', async () => {
  const { call, auditCount } = await start();

  const steps = [
    ['POST /api/v1/accounts', () =>
      call('/api/v1/accounts', {
        method: 'POST',
        body: { email: 'audited@support-desk.local', name: 'Audited', role: 'agent' },
      })],
  ];

  let created;
  for (const [name, run] of steps) {
    const before = auditCount();
    const res = await run();
    assert.ok(res.ok, `${name} should succeed, got ${res.status}`);
    created = (await res.json()).user;
    assert.equal(auditCount(), before + 1, `${name} must write exactly one audit row`);
  }

  const rest = [
    ['PATCH /api/v1/accounts/:id/role', () =>
      call(`/api/v1/accounts/${created.id}/role`, { method: 'PATCH', body: { role: 'admin' } })],
    ['POST /api/v1/accounts/:id/disable', () =>
      call(`/api/v1/accounts/${created.id}/disable`, { method: 'POST' })],
    ['POST /api/v1/accounts/:id/re-enable', () =>
      call(`/api/v1/accounts/${created.id}/re-enable`, { method: 'POST' })],
  ];

  for (const [name, run] of rest) {
    const before = auditCount();
    const res = await run();
    assert.ok(res.ok, `${name} should succeed, got ${res.status}`);
    assert.equal(auditCount(), before + 1, `${name} must write exactly one audit row`);
  }
});

test('a refused mutation leaves neither the change nor a row', async () => {
  const { call, real, auditCount } = await start();

  const created = await (await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'refused@support-desk.local', name: 'Refused', role: 'agent' },
  })).json();
  const before = auditCount();

  // An unknown id, and a role the enum does not contain. Both are refusals,
  // and a refusal that wrote an audit row would be a trail recording things
  // that never happened.
  const missing = await call('/api/v1/accounts/no-such-id/disable', { method: 'POST' });
  assert.equal(missing.status, 404);

  const badRole = await call(`/api/v1/accounts/${created.user.id}/role`, {
    method: 'PATCH',
    body: { role: 'wizard' },
  });
  assert.equal(badRole.status, 422);

  assert.equal(auditCount(), before, 'a refusal writes no audit row');
  assert.equal(
    real.prepare('SELECT role FROM users WHERE id = ?').get(created.user.id).role,
    'agent',
    'and changes nothing',
  );
});

test('an unaudited mutation cannot reach the database through the app either', async () => {
  const { real } = await start();
  const db = wrapDbWithAuditGuard(real);
  const before = real.prepare('SELECT count(*) AS n FROM users').get().n;

  // What a future route that forgot its audit call would do. The guard refuses
  // the commit, so the change never lands — this is the acceptance criterion
  // 'a new mutating route added later that does not write an audit row' with
  // the route standing in for the author who forgot.
  db.exec('BEGIN');
  db.prepare('UPDATE users SET name = ? WHERE 1=1').run('renamed by nobody');
  assert.throws(() => db.exec('COMMIT'), /AUDIT_GUARD: mutation of users/);
  real.exec('ROLLBACK');

  assert.equal(real.prepare('SELECT count(*) AS n FROM users').get().n, before);
  assert.equal(
    real.prepare("SELECT count(*) AS n FROM users WHERE name = 'renamed by nobody'").get().n,
    0,
  );
});

test('a mutation with nobody signed in records the actor as absent, not invented', async () => {
  const { real } = await start();
  const { createAuditWriter } = await import('./audit.service.js');
  createAuditWriter({ db: real }).record(null, {
    entity: 'user',
    entityId: 'u-sys',
    verb: 'user.create',
    before: null,
    after: { role: 'agent' },
    at: '2026-08-28T00:00:00.000Z',
  });

  const row = real.prepare('SELECT actor_id FROM audit_events ORDER BY rowid DESC LIMIT 1').get();
  assert.equal(row.actor_id, null);
});

test('no audit row carries a password, a hash or a token', async () => {
  const { call, real, auditCount } = await start();
  const res = await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'quiet@support-desk.local', name: 'Quiet', role: 'agent' },
  });
  const { user, initialPassword } = await res.json();
  await call(`/api/v1/accounts/${user.id}/role`, { method: 'PATCH', body: { role: 'admin' } });
  assert.ok(auditCount() > 0);

  // rowid, never at: two rows written in the same second have equal timestamps
  // and the engine orders them as it pleases (L-19).
  const rows = real.prepare('SELECT diff FROM audit_events ORDER BY rowid ASC').all();

  // Walk the keys rather than scanning the text: a person legitimately named
  // "Secretive" would trip a substring search, and a check that cries wolf gets
  // relaxed until it catches nothing.
  const keysOf = (value, out = []) => {
    if (value === null || typeof value !== 'object') return out;
    for (const [k, v] of Object.entries(value)) {
      out.push(k.toLowerCase());
      keysOf(v, out);
    }
    return out;
  };

  for (const { diff } of rows) {
    for (const key of keysOf(JSON.parse(diff))) {
      for (const forbidden of ['password', 'token', 'secret', 'hash']) {
        assert.ok(!key.includes(forbidden), `a diff must carry no ${forbidden} field: ${diff}`);
      }
    }
    assert.ok(!diff.includes(initialPassword), 'and never the value itself');
  }
});
