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

function insertCustomer(db, email, deletedAt = null) {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO customers (id, name, email, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, 'A customer', email, now, now, deletedAt);
  return id;
}

test('a soft-deleted email can be reused; an active duplicate cannot', () => {
  const db = migrated();

  const a = insertCustomer(db, 'x@y');
  db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    a,
  );

  // B reuses the address A gave up — allowed, the unique index is partial.
  assert.doesNotThrow(() => insertCustomer(db, 'x@y'));

  // C collides with the still-active B — refused.
  assert.throws(() => insertCustomer(db, 'x@y'), /UNIQUE|constraint/i);
});

test('email uniqueness is case-insensitive', () => {
  const db = migrated();

  insertCustomer(db, 'x@y');
  assert.throws(() => insertCustomer(db, 'X@Y'), /UNIQUE|constraint/i);
});
