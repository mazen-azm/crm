import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase } from './connection.js';
import { runMigrations } from './migrate.js';

// One row per queue filter: the column it filters on, and the index that must
// serve it. The queue always adds `deleted_at IS NULL` and orders by
// `created_at DESC`, so the plan must hit the partial index, not scan.
const FILTERS = [
  { column: 'status', index: 'tickets_status_created_at_idx' },
  { column: 'assignee_id', index: 'tickets_assignee_created_at_idx' },
  { column: 'priority', index: 'tickets_priority_created_at_idx' },
  { column: 'category_id', index: 'tickets_category_created_at_idx' },
];

function queryPlan(db, column) {
  const sql =
    `SELECT id FROM tickets WHERE ${column} = ? AND deleted_at IS NULL ` +
    'ORDER BY created_at DESC LIMIT 50';
  return db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all('x')
    .map((row) => row.detail)
    .join(' | ');
}

test('each queue filter uses its index rather than scanning tickets', () => {
  const db = openDatabase(':memory:');
  runMigrations(db);

  for (const { column, index } of FILTERS) {
    const plan = queryPlan(db, column);
    assert.ok(plan.includes(`USING INDEX ${index}`), `${column}: ${plan}`);
    assert.ok(!plan.includes('SCAN tickets'), `${column} scans: ${plan}`);
  }
});
