import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase } from './connection.js';
import { runMigrations } from './migrate.js';

const EXPECTED_TABLES = [
  'schema_migrations',
  'customers',
  'ticket_categories',
  'tickets',
  'sla_targets',
  'sla_clocks',
  'sla_breaches',
  'escalations',
  'audit_events',
];

function tableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => row.name);
}

test('empty DB -> every table exists after one run', () => {
  const db = openDatabase(':memory:');
  runMigrations(db);

  const tables = tableNames(db);
  for (const name of EXPECTED_TABLES) {
    assert.ok(tables.includes(name), `expected table ${name}`);
  }
});

test('second run is a no-op: same ledger, no throw', () => {
  const db = openDatabase(':memory:');

  const first = runMigrations(db);
  const countAfterFirst = db
    .prepare('SELECT COUNT(*) AS n FROM schema_migrations')
    .get().n;

  const second = runMigrations(db);
  const countAfterSecond = db
    .prepare('SELECT COUNT(*) AS n FROM schema_migrations')
    .get().n;

  assert.equal(first.applied, countAfterFirst);
  assert.equal(second.applied, 0);
  assert.equal(second.skipped, countAfterFirst);
  assert.equal(countAfterSecond, countAfterFirst);
});
