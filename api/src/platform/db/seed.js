import { randomBytes, randomUUID } from 'node:crypto';

import { config } from '../config/index.js';
import { openDatabase } from './connection.js';
import { runMigrations } from './migrate.js';
import { hashPassword } from '../../shared/password.js';
import { staff, customers, categories, slaTargets } from './seed.data.js';

// The seed is a second composition root, on purpose (docs/architecture.md).
// It imports nothing from app.js or platform/http/: it opens its own
// connection, runs its own migrations and writes its own rows. Every service
// signature therefore has two call sites, and a change that breaks one is
// caught by the other.
//
// Idempotence is by identity, not by counting. Every insert names the unique
// index that already guards it and does nothing on conflict — a
// count-then-decide check races with itself and lies under concurrency.

export function seed(db, {
  now = () => new Date().toISOString(),
  newId = () => randomUUID(),
  newPassword = () => randomBytes(18).toString('base64url'),
} = {}) {
  runMigrations(db);

  const adminPassword = newPassword();
  const adminCreated = seedStaff(db, adminPassword, { now, newId, newPassword });
  seedCustomers(db, { now, newId });
  seedCategories(db, { now, newId });
  seedSlaTargets(db, { now, newId });

  // adminCreated is the difference between "here is the password" and "here is
  // a password that does nothing". On a second run the admin already exists,
  // the insert does nothing, and adminPassword is a string this run invented
  // and never stored. Callers must not print it without asking.
  return { adminEmail: staff[0].email, adminPassword, adminCreated };
}

// Returns whether the admin row was actually written this run. The conflict
// clause makes a second run harmless, and it also makes the generated password
// meaningless — so whether the insert happened is the one thing a caller needs
// to know before repeating it to anybody.
function seedStaff(db, adminPassword, { now, newId, newPassword }) {
  const insert = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) WHERE deleted_at IS NULL DO NOTHING
  `);
  const at = now();
  let adminCreated = false;
  staff.forEach((row, i) => {
    // Only the admin's password is the one the operator is told. The rest are
    // hashed and discarded, so no account ships with a password anyone knows.
    const plaintext = i === 0 ? adminPassword : newPassword();
    const { changes } = insert.run(newId(), row.email, hashPassword(plaintext), row.name, row.role, at, at);
    if (i === 0) adminCreated = changes === 1;
  });
  return adminCreated;
}

function seedCustomers(db, { now, newId }) {
  const byEmail = db.prepare(`
    INSERT INTO customers (id, name, email, phone, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) WHERE email IS NOT NULL AND deleted_at IS NULL DO NOTHING
  `);
  // A null email cannot arbitrate a conflict — the unique index is partial on
  // email IS NOT NULL — so such a row carries a fixed id from the data file
  // and lets identity do the work instead.
  const byId = db.prepare(`
    INSERT INTO customers (id, name, email, phone, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);
  const at = now();
  for (const row of customers) {
    const statement = row.email == null ? byId : byEmail;
    statement.run(row.id ?? newId(), row.name, row.email, row.phone, row.address, at, at);
  }
}

function seedCategories(db, { now, newId }) {
  const insert = db.prepare(`
    INSERT INTO ticket_categories (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) WHERE deleted_at IS NULL DO NOTHING
  `);
  const at = now();
  for (const row of categories) insert.run(newId(), row.name, at, at);
}

function seedSlaTargets(db, { now, newId }) {
  // priority carries a plain UNIQUE, so the arbiter needs no predicate.
  const insert = db.prepare(`
    INSERT INTO sla_targets (id, priority, first_response_minutes, resolution_minutes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(priority) DO NOTHING
  `);
  const at = now();
  for (const row of slaTargets) {
    insert.run(newId(), row.priority, row.first_response_minutes, row.resolution_minutes, at, at);
  }
}

// The CLI block that used to sit here moved to api/src/seed.js. It had to: the
// demo half of seeding walks a ticket through the tickets service, and this
// file may not know a feature's name (verify-architecture.mjs,
// api-shared-platform-no-feature). What stays here is the reference data, which
// needs no feature and is imported directly by every test that wants a database
// without a demo queue.
