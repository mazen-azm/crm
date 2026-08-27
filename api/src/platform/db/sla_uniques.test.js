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

function insertTicket(db) {
  const now = new Date().toISOString();
  const customerId = randomUUID();
  db.prepare(
    `INSERT INTO customers (id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
  ).run(customerId, 'A customer', now, now);

  const ticketId = randomUUID();
  db.prepare(
    `INSERT INTO tickets
       (id, customer_id, status, priority, subject, body, created_at, updated_at)
     VALUES (?, ?, 'new', 'normal', 'S', 'B', ?, ?)`,
  ).run(ticketId, customerId, now, now);
  return ticketId;
}

function insertBreach(db, ticketId, kind) {
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO sla_breaches
       (id, ticket_id, kind, breached_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, ticketId, kind, now, now, now);
  return id;
}

function insertEscalation(db, breachId) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO escalations (id, breach_id, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), breachId, now, now);
}

test('the same (ticket, kind) breach cannot be recorded twice', () => {
  const db = migrated();
  const ticketId = insertTicket(db);

  insertBreach(db, ticketId, 'resolution');
  assert.throws(() => insertBreach(db, ticketId, 'resolution'), /UNIQUE|constraint/i);
});

test('the same breach cannot be escalated twice', () => {
  const db = migrated();
  const ticketId = insertTicket(db);
  const breachId = insertBreach(db, ticketId, 'resolution');

  insertEscalation(db, breachId);
  assert.throws(() => insertEscalation(db, breachId), /UNIQUE|constraint/i);
});
