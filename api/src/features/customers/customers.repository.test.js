// The repository's own guards, tested where they live.
//
// updateCustomerContacts builds column names into SQL. The service restricts
// what reaches it, so a mutation removing the repository's own allow-list
// passes every test that goes through the route — which is exactly why this
// file exists: a guard nothing exercises is a guard somebody deletes.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { insertCustomer, updateCustomerContacts } from './customers.repository.js';

const fresh = () => {
  const db = openDatabase(':memory:');
  seed(db);
  insertCustomer(db, {
    id: 'c-1',
    name: 'Aiko Tanaka',
    email: 'aiko@example.com',
    phone: '+20 2 5555 0177',
    at: '2026-08-31T00:00:00.000Z',
  });
  return db;
};

test('only the contact columns may be written', () => {
  const db = fresh();

  // Not a 422 — a throw. A caller reaching here with an unexpected key is a
  // programming mistake rather than a bad request, and the string it would
  // otherwise splice into the UPDATE is why the check is here rather than one
  // layer away.
  for (const column of ['address', 'user_id', 'deleted_at', 'id', 'name = ?, deleted_at']) {
    assert.throws(
      () => updateCustomerContacts(db, { id: 'c-1', changes: { [column]: 'x' }, at: 'now' }),
      /not a correctable column/,
      column,
    );
  }
  // And nothing was written by any of them.
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get('c-1');
  assert.equal(row.address, null);
  assert.equal(row.user_id, null);
  assert.equal(row.deleted_at, null);
});

test('a deleted customer is not an update target', () => {
  const db = fresh();
  db.prepare("UPDATE customers SET deleted_at = '2026-08-31T00:00:00.000Z' WHERE id = 'c-1'").run();

  const written = updateCustomerContacts(db, { id: 'c-1', changes: { phone: '+1' }, at: 'now' });

  // null rather than a row, so the service answers 404. The WHERE clause is
  // what decides it; a service check alone would leave the repository willing.
  assert.equal(written, null);
  assert.equal(db.prepare('SELECT phone FROM customers WHERE id = ?').get('c-1').phone, '+20 2 5555 0177');
});

test('an empty change writes nothing rather than an UPDATE with no assignments', () => {
  const db = fresh();
  // `UPDATE customers SET , updated_at = ?` is a syntax error, and the caller
  // has already refused this case — but a repository that produced invalid SQL
  // when handed an empty object would turn a caller's mistake into a 500.
  assert.equal(updateCustomerContacts(db, { id: 'c-1', changes: {}, at: 'now' }), null);
});
