// The guard in isolation: what it classifies, when it refuses, and that it
// refuses BEFORE the commit reaches the database.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase } from '../../platform/db/connection.js';
import { runMigrations } from '../../platform/db/migrate.js';
import { wrapDbWithAuditGuard } from './audit.guard.js';

function fresh() {
  const real = openDatabase(':memory:');
  runMigrations(real);
  return { real, db: wrapDbWithAuditGuard(real) };
}

const addUser = (db, id) =>
  db
    .prepare(`
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, 'x:y', ?, 'agent', '2026-08-28', '2026-08-28')
    `)
    .run(id, `${id}@support-desk.local`, id);

const addAudit = (db, id) =>
  db
    .prepare(`
      INSERT INTO audit_events (id, actor_id, entity, entity_id, verb, at, diff)
      VALUES (?, NULL, 'user', ?, 'user.create', '2026-08-28', '{}')
    `)
    .run(id, id);

const users = (real) => real.prepare('SELECT count(*) AS n FROM users').get().n;

test('an unaudited mutation cannot commit, and does not land', () => {
  const { real, db } = fresh();
  const before = users(real);

  db.exec('BEGIN');
  addUser(db, 'u-1');
  assert.throws(() => db.exec('COMMIT'), /AUDIT_GUARD: mutation of users/);

  // The throw happens before the real COMMIT, so the caller's ROLLBACK frame
  // has something to roll back. Nothing was allowed to land and then be
  // complained about.
  real.exec('ROLLBACK');
  assert.equal(users(real), before);
});

test('the same mutation with its audit row commits', () => {
  const { real, db } = fresh();
  db.exec('BEGIN');
  addUser(db, 'u-2');
  addAudit(db, 'a-2');
  assert.doesNotThrow(() => db.exec('COMMIT'));
  assert.equal(real.prepare("SELECT count(*) AS n FROM users WHERE id='u-2'").get().n, 1);
});

test('a mutation issued through exec is caught too — one classifier, both doors', () => {
  const { db } = fresh();
  db.exec('BEGIN');
  // Never goes near prepare(). A guard that wrapped only .run would have let
  // this commit unaudited.
  db.exec("DELETE FROM users WHERE id = 'nobody'");
  assert.throws(() => db.exec('COMMIT'), /AUDIT_GUARD: mutation of users/);
});

test('rollback clears the state, and the next transaction starts clean', () => {
  const { db } = fresh();
  db.exec('BEGIN');
  addUser(db, 'u-3');
  db.exec('ROLLBACK');
  assert.equal(db._txn(), null);

  db.exec('BEGIN');
  addUser(db, 'u-4');
  addAudit(db, 'a-4');
  assert.doesNotThrow(() => db.exec('COMMIT'));
});

test('an audit-only transaction is legal', () => {
  const { db } = fresh();
  db.exec('BEGIN');
  addAudit(db, 'a-5');
  assert.doesNotThrow(() => db.exec('COMMIT'));
});

test('reads are not mutations', () => {
  const { db } = fresh();
  db.exec('BEGIN');
  db.prepare('SELECT count(*) AS n FROM users').get();
  db.prepare('SELECT id FROM users').all();
  assert.doesNotThrow(() => db.exec('COMMIT'));
});

test('leading whitespace and a comment do not hide the keyword', () => {
  const { db } = fresh();
  db.exec('BEGIN');
  db.exec("  -- tidy up\n   DELETE FROM users WHERE id = 'nobody'");
  assert.throws(() => db.exec('COMMIT'), /AUDIT_GUARD/);
});

test('outside a transaction the guard is inert — migrations and the seed must still run', () => {
  const { real, db } = fresh();
  assert.doesNotThrow(() => addUser(db, 'u-6'));
  assert.equal(real.prepare("SELECT count(*) AS n FROM users WHERE id='u-6'").get().n, 1);
});

test('a nested BEGIN is refused loudly rather than discovered later', () => {
  const { db } = fresh();
  db.exec('BEGIN');
  assert.throws(() => db.exec('BEGIN'), /AUDIT_GUARD: nested BEGIN/);
});
