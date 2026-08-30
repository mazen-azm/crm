// Proves scripts/criteria/customers.md section CUSTOMERS-5-API.
//
// The service directly, not through a route: this story adds none, because the
// only caller is CHANNELS-1-API and it will hold the service, not a URL. That
// also means the audit guarantee test cannot see this method — it derives the
// routes it checks from the router — so the guard it uses is applied here by
// hand instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { wrapDbWithAuditGuard } from '../audit/index.js';
import { createCustomersService } from './customers.service.js';

const NOW = () => 1_800_000_000;

function start() {
  const real = openDatabase(':memory:');
  // The guard goes on AFTER the seed, for the reason the guarantee test gives:
  // seeding is a mutation with no actor, outside any transaction.
  seed(real);
  const db = wrapDbWithAuditGuard(real);
  // No tickets service: resolution never reads a ticket, and handing it a stub
  // would suggest it might.
  const service = createCustomersService({ db, now: NOW });

  const count = (table) => real.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
  const auditRows = () =>
    real.prepare("SELECT * FROM audit_events WHERE entity = 'customer' ORDER BY rowid").all();
  const rowOf = (id) => real.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  const put = (row) =>
    real
      .prepare(`INSERT INTO customers (id, name, email, phone, created_at, updated_at, deleted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(row.id, row.name, row.email, row.phone ?? null, '2026-01-01T00:00:00.000Z',
           '2026-01-01T00:00:00.000Z', row.deletedAt ?? null);

  return { db: real, service, count, auditRows, rowOf, put };
}

const refused = (fn, fields) => {
  assert.throws(fn, (err) => {
    assert.equal(err.status, 422);
    assert.deepEqual(err.fields, fields);
    return true;
  });
};

test('an address already on file resolves to that customer, and writes nothing', () => {
  const { service, count, auditRows, put } = start();
  put({ id: 'c-1', name: 'Aiko Tanaka', email: 'aiko@example.com', phone: '+81 90 0000 0000' });

  const before = { customers: count('customers'), audit: auditRows().length };
  const resolved = service.resolveByEmail(null, { email: 'aiko@example.com' });

  assert.equal(resolved.id, 'c-1');
  assert.equal(resolved.name, 'Aiko Tanaka');
  // A read is not a mutation. No second row, and no audit event — the same
  // rule search and read already obey.
  assert.equal(count('customers'), before.customers);
  assert.equal(auditRows().length, before.audit);
});

test('two spellings of one address are one person', () => {
  const { service, count, put } = start();
  put({ id: 'c-1', name: 'Aiko Tanaka', email: 'aiko@example.com' });
  const before = count('customers');

  // The folding is the column's — TEXT COLLATE NOCASE. Nothing in the query
  // lowercases anything, and a LOWER() there would defeat the index.
  assert.equal(service.resolveByEmail(null, { email: 'AIKO@Example.COM' }).id, 'c-1');
  assert.equal(service.resolveByEmail(null, { email: '  aiko@EXAMPLE.com  ' }).id, 'c-1');
  assert.equal(count('customers'), before);
});

test('an address nobody has creates a customer, and the system is who did it', () => {
  const { service, count, auditRows } = start();
  const before = count('customers');

  const created = service.resolveByEmail(null, {
    email: 'nobody@example.com',
    name: 'Leila Mansour',
  });

  assert.equal(count('customers'), before + 1);
  assert.equal(created.name, 'Leila Mansour');
  assert.equal(created.email, 'nobody@example.com');

  const [row] = auditRows();
  assert.equal(row.verb, 'customer.create');
  assert.equal(row.entity_id, created.id);
  // Null, not a borrowed staff id and not an invented "seed" user. Nobody was
  // signed in, and a row claiming a person did what the system did is worse
  // than one admitting nobody did (BR-2).
  assert.equal(row.actor_id, null);
});

test('a request with a name does not rename somebody already on file', () => {
  const { service, rowOf, put } = start();
  put({ id: 'c-1', name: 'Aiko Tanaka', email: 'aiko@example.com' });

  service.resolveByEmail(null, { email: 'aiko@example.com', name: 'Somebody Else' });

  // The whole reason the hit branch touches nothing: a stranger typing into a
  // public form must not be able to rename a customer.
  assert.equal(rowOf('c-1').name, 'Aiko Tanaka');
  assert.equal(rowOf('c-1').updated_at, '2026-01-01T00:00:00.000Z');
});

test('an address held only by a removed customer creates a new one, and leaves the old alone', () => {
  const { service, rowOf, put } = start();
  put({
    id: 'c-gone',
    name: 'Aiko Tanaka',
    email: 'aiko@example.com',
    deletedAt: '2026-02-01T00:00:00.000Z',
  });

  const created = service.resolveByEmail(null, { email: 'aiko@example.com', name: 'Aiko T' });

  // The partial unique index is scoped to live rows, which is exactly what
  // permits this. BR-1 keeps the removed row for the trail, not for writing to.
  assert.notEqual(created.id, 'c-gone');
  assert.equal(rowOf('c-gone').deleted_at, '2026-02-01T00:00:00.000Z');
  assert.equal(rowOf('c-gone').name, 'Aiko Tanaka');
});

test('a request with no name is named by its address, rather than by a placeholder', () => {
  const { service } = start();

  const created = service.resolveByEmail(null, { email: 'nameless@example.com' });

  // The column is NOT NULL and a public form may collect no name. The address
  // reads on a list as "we know how to reach them and not what to call them",
  // which is visibly incomplete rather than quietly wrong.
  assert.equal(created.name, 'nameless@example.com');
});

test('a request that cannot be attributed is refused naming the field', () => {
  const { service } = start();

  // Absent, null, blank, whitespace, malformed and not-a-string are one
  // answer: an address identifies, and none of these is an address (I-4).
  refused(() => service.resolveByEmail(null, {}), ['email']);
  refused(() => service.resolveByEmail(null, { email: null }), ['email']);
  refused(() => service.resolveByEmail(null, { email: '' }), ['email']);
  refused(() => service.resolveByEmail(null, { email: '   ' }), ['email']);
  refused(() => service.resolveByEmail(null, { email: 'not-an-address' }), ['email']);
  refused(() => service.resolveByEmail(null, { email: 42 }), ['email']);
  refused(() => service.resolveByEmail(null), ['email']);
});

test('a name that is not a string is refused, rather than becoming a 500', () => {
  const { service } = start();

  // normaliseCustomer calls .trim(). A number arriving where a string was
  // assumed would reach it and throw, and an unhandled TypeError leaves the
  // caller told their bad input was our fault.
  refused(() => service.resolveByEmail(null, { email: 'a@example.com', name: 42 }), ['name']);
  refused(() => service.resolveByEmail(null, { email: 'a@example.com', name: {} }), ['name']);
});

test('a refused resolution writes nothing at all', () => {
  const { service, count, auditRows } = start();
  const before = { customers: count('customers'), audit: auditRows().length };

  assert.throws(() => service.resolveByEmail(null, { email: 'not-an-address' }));

  assert.equal(count('customers'), before.customers);
  assert.equal(auditRows().length, before.audit);
});

test('resolution never writes a users row, on any path', () => {
  const { service, count, put } = start();
  put({ id: 'c-1', name: 'Aiko Tanaka', email: 'aiko@example.com' });
  const before = count('users');

  service.resolveByEmail(null, { email: 'aiko@example.com' });          // hit
  service.resolveByEmail(null, { email: 'fresh@example.com' });         // miss

  // I-1: users and customers are two tables. A resolved customer has not
  // signed in, and the column that would link them arrives with
  // CUSTOMERS-6-API.
  assert.equal(count('users'), before);
});
