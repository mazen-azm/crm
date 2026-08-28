import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { openDatabase } from './connection.js';
import { runMigrations } from './migrate.js';

function migrated() {
  const db = openDatabase(':memory:');
  runMigrations(db);
  return db;
}

test('an audit row still resolves after its subject is soft-deleted (BR-1)', () => {
  const db = migrated();
  const now = new Date().toISOString();

  const customerId = randomUUID();
  db.prepare(
    `INSERT INTO customers (id, name, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(customerId, 'A customer', 'x@y', now, now);

  db.prepare(
    `INSERT INTO audit_events (id, actor_id, entity, entity_id, verb, at, diff)
     VALUES (?, ?, 'customer', ?, 'create', ?, ?)`,
  ).run(randomUUID(), null, customerId, now, '{}');

  // Hide the customer.
  db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    customerId,
  );

  const audit = db
    .prepare("SELECT * FROM audit_events WHERE entity = 'customer' AND entity_id = ?")
    .get(customerId);
  assert.ok(audit, 'audit row survives');

  // entity_id still points at a real (soft-deleted) customer row.
  const subject = db
    .prepare('SELECT id, deleted_at FROM customers WHERE id = ?')
    .get(audit.entity_id);
  assert.ok(subject, 'subject row still exists');
  assert.ok(subject.deleted_at, 'subject is soft-deleted, not gone');

  // audit_events carries no deleted_at column at all.
  const columns = db
    .prepare('PRAGMA table_info(audit_events)')
    .all()
    .map((row) => row.name);
  assert.ok(!columns.includes('deleted_at'), 'audit_events has no deleted_at');
  assert.ok(!columns.includes('updated_at'), 'audit_events has no updated_at');
});
