import { fileURLToPath } from 'node:url';
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
  seedStaff(db, adminPassword, { now, newId, newPassword });
  seedCustomers(db, { now, newId });
  seedCategories(db, { now, newId });
  seedSlaTargets(db, { now, newId });

  return { adminEmail: staff[0].email, adminPassword };
}

function seedStaff(db, adminPassword, { now, newId, newPassword }) {
  const insert = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) WHERE deleted_at IS NULL DO NOTHING
  `);
  const at = now();
  staff.forEach((row, i) => {
    // Only the admin's password is the one the operator is told. The rest are
    // hashed and discarded, so no account ships with a password anyone knows.
    const plaintext = i === 0 ? adminPassword : newPassword();
    insert.run(newId(), row.email, hashPassword(plaintext), row.name, row.role, at, at);
  });
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`seeding ${config.dbPath}`);
  const db = openDatabase(config.dbPath);
  try {
    const { adminEmail, adminPassword } = seed(db);
    console.log(`seeded ${config.dbPath}`);
    console.log(`admin email:    ${adminEmail}`);
    // On a second run the admin already exists, so this password was NOT
    // stored — the printed line is the one this run generated, not the one
    // that works. Re-seed a fresh database, or reset it through identity.
    console.log(`admin password: ${adminPassword}`);
  } finally {
    db.close();
  }
}
