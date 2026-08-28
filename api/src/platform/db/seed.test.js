// Proves scripts/criteria/platform.md section PLATFORM-8-API: an empty
// database gets staff, customers, categories and service-level targets; a
// second run duplicates nothing; the password is printed because an admin who
// cannot sign in has been handed nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { scryptSync } from 'node:crypto';

import { openDatabase } from './connection.js';
import { seed } from './seed.js';
import { hashPassword } from '../../shared/password.js';
import { staff, customers, categories, slaTargets } from './seed.data.js';

const TABLES = ['users', 'customers', 'ticket_categories', 'sla_targets'];
const counts = (db) =>
  Object.fromEntries(TABLES.map((t) => [t, db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n]));

test('an empty database gets staff, customers, categories and targets', () => {
  const db = openDatabase(':memory:');
  seed(db);
  assert.deepEqual(counts(db), {
    users: staff.length,
    customers: customers.length,
    ticket_categories: categories.length,
    sla_targets: slaTargets.length,
  });
});

test('a second run duplicates nothing — including the row with no email', () => {
  const db = openDatabase(':memory:');
  seed(db);
  const first = counts(db);
  seed(db);
  seed(db);
  assert.deepEqual(counts(db), first);
  // The null-email customer is the one with no unique arbiter; it is kept
  // single by its fixed id, so prove that specifically.
  const walkIn = db.prepare('SELECT count(*) AS n FROM customers WHERE email IS NULL').get().n;
  assert.equal(walkIn, 1);
});

test('the seed returns the admin email and a password it generated', () => {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  assert.equal(adminEmail, staff[0].email);
  assert.ok(adminPassword.length >= 16, 'the printed password is too short to be one');
  // Two runs must not produce the same password — a fixed one would be a
  // credential living in the repository.
  assert.notEqual(seed(openDatabase(':memory:')).adminPassword, adminPassword);
});

test('the stored hash verifies the printed password, and is not the password', () => {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const stored = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(adminEmail).password_hash;
  assert.ok(!stored.includes(adminPassword), 'the plaintext is in the column');

  const [salt, hash] = stored.split(':');
  const recomputed = scryptSync(adminPassword, Buffer.from(salt, 'hex'), 64).toString('hex');
  assert.equal(recomputed, hash);
});

test('two hashes of one password differ, because each carries its own salt', () => {
  assert.notEqual(hashPassword('same-password'), hashPassword('same-password'));
});

test('an email that differs only in case is the same staff member', () => {
  const db = openDatabase(':memory:');
  seed(db);
  const found = db
    .prepare('SELECT count(*) AS n FROM users WHERE email = ?')
    .get(staff[0].email.toUpperCase()).n;
  assert.equal(found, 1);
});

test('the seed is a second composition root — it reaches into no application code', () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(path.join(HERE, 'seed.js'), 'utf8');
  // Read the import specifiers, not the file's prose. A whole-text search
  // matches the comment that explains the rule and fails on the explanation.
  const imported = [...source.matchAll(/^import[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  for (const specifier of imported) {
    assert.ok(
      !/app\.js$|\/http\/|^express$/.test(specifier),
      `seed.js imports ${specifier}, which belongs to the application's composition root`,
    );
  }
  assert.ok(imported.length > 0, 'no imports were parsed — the check read nothing');
});
