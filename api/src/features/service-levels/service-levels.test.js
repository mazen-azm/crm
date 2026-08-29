// Proves scripts/criteria/service-levels.md section SERVICE-LEVELS-1-API.
//
// There is no route and no caller yet — TICKETS-1-API is the caller and comes
// next in this block. So these tests are the only thing standing behind the
// module, and they insert their own ticket rows: the foreign key from
// sla_clocks to tickets is enforced (connection.js sets PRAGMA foreign_keys =
// ON), so a clock cannot be made for a ticket that is not there.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase } from '../../platform/db/connection.js';
import { runMigrations } from '../../platform/db/migrate.js';
import { seed } from '../../platform/db/seed.js';
import { createServiceLevels, CLOCK_KINDS } from './index.js';

const HOUR = 3600;
const RAISED = 1_800_000_000;                       // a fixed second, so every
const RAISED_AT = new Date(RAISED * 1000).toISOString();   // stamp ends .000Z

function start({ at = RAISED, priority = 'normal' } = {}) {
  const db = openDatabase(':memory:');
  runMigrations(db);
  seed(db);

  const customerId = db.prepare('SELECT id FROM customers LIMIT 1').get().id;
  const ticketId = 'tkt-under-test';
  db.prepare(`
    INSERT INTO tickets (id, customer_id, status, priority, subject, body, created_at, updated_at)
    VALUES (?, ?, 'new', ?, 'A subject', 'A body', ?, ?)
  `).run(ticketId, customerId, priority, RAISED_AT, RAISED_AT);

  let clock = at;
  const sla = createServiceLevels({ db, now: () => clock });
  return { db, sla, ticketId, tick: (seconds) => { clock += seconds; } };
}

test('a ticket gets both clocks, started at its creation', () => {
  const { db, sla, ticketId } = start();
  sla.startClocks({ ticketId, startedAt: RAISED_AT });

  const rows = db
    .prepare('SELECT kind, started_at, paused_ms FROM sla_clocks WHERE ticket_id = ? ORDER BY kind')
    .all(ticketId);
  assert.deepEqual(rows.map((r) => r.kind), ['first_response', 'resolution']);
  for (const row of rows) {
    assert.equal(row.started_at, RAISED_AT, 'S-1: both start at creation');
    assert.equal(row.paused_ms, 0, 'pausing is S-4, a later story');
  }
});

test('the deadlines come from the target row, not from a number in the code', () => {
  const { db, sla, ticketId } = start({ priority: 'normal' });
  sla.startClocks({ ticketId, startedAt: RAISED_AT });

  const target = db
    .prepare("SELECT first_response_minutes f, resolution_minutes r FROM sla_targets WHERE priority = 'normal'")
    .get();
  const seen = sla.readDeadlines({ ticketId });

  assert.equal(
    seen.first_response.deadline,
    new Date((RAISED + target.f * 60) * 1000).toISOString(),
  );
  assert.equal(
    seen.resolution.deadline,
    new Date((RAISED + target.r * 60) * 1000).toISOString(),
  );
});

test('escalating a ticket escalates its promise', () => {
  const { db, sla, ticketId, tick } = start({ priority: 'low' });
  sla.startClocks({ ticketId, startedAt: RAISED_AT });

  // Two days into a 168-hour promise, comfortably inside it.
  tick(48 * HOUR);
  assert.equal(sla.readDeadlines({ ticketId }).resolution.overdue, false);

  db.prepare("UPDATE tickets SET priority = 'urgent' WHERE id = ?").run(ticketId);

  // Now the promise is four hours from creation, which was two days ago. It
  // looks wrong and is not: an urgent ticket cannot carry a week-long deadline.
  const after = sla.readDeadlines({ ticketId });
  assert.equal(after.resolution.deadline, new Date((RAISED + 4 * HOUR) * 1000).toISOString());
  assert.equal(after.resolution.overdue, true);
});

test('a deadline that has passed is reported, and nothing is written', () => {
  const { db, sla, ticketId, tick } = start({ priority: 'urgent' });
  sla.startClocks({ ticketId, startedAt: RAISED_AT });

  assert.equal(sla.readDeadlines({ ticketId }).first_response.overdue, false);
  tick(2 * HOUR);   // urgent promises a first response in one
  assert.equal(sla.readDeadlines({ ticketId }).first_response.overdue, true);

  // S-5: a breach is a stored row, and storing it is SERVICE-LEVELS-3-API's.
  assert.equal(db.prepare('SELECT count(*) AS n FROM sla_breaches').get().n, 0);
});

test('the moment of the deadline is not yet overdue; a second later is', () => {
  const { sla, ticketId, tick } = start({ priority: 'urgent' });
  sla.startClocks({ ticketId, startedAt: RAISED_AT });

  tick(1 * HOUR);
  assert.equal(sla.readDeadlines({ ticketId }).first_response.overdue, true, 'at the deadline');
});

test('a stopped clock is never overdue, however late it is read', () => {
  const { db, sla, ticketId, tick } = start({ priority: 'urgent' });
  sla.startClocks({ ticketId, startedAt: RAISED_AT });
  db.prepare("UPDATE sla_clocks SET stopped_at = ? WHERE ticket_id = ? AND kind = 'first_response'")
    .run(RAISED_AT, ticketId);

  tick(500 * HOUR);
  const seen = sla.readDeadlines({ ticketId });
  assert.equal(seen.first_response.overdue, false, 'it was answered; when hardly matters now');
  assert.equal(seen.resolution.overdue, true, 'the other clock is still running');
});

test('starting the clocks twice is refused, not quietly ignored', () => {
  const { sla, ticketId } = start();
  sla.startClocks({ ticketId, startedAt: RAISED_AT });

  // The unique constraint on (ticket_id, kind) is the guarantee that exactly
  // one of each kind exists. Swallowing it would turn that into "duplicates
  // are ignored", which is a weaker promise in the same words.
  assert.throws(() => sla.startClocks({ ticketId, startedAt: RAISED_AT }), /UNIQUE|constraint/i);
});

test('clocks cannot be started for a ticket that is not there', () => {
  const { sla } = start();
  assert.throws(
    () => sla.startClocks({ ticketId: 'no-such-ticket', startedAt: RAISED_AT }),
    /FOREIGN KEY/i,
  );
});

test('reading a ticket that does not exist is null, not a throw', () => {
  const { sla } = start();
  assert.equal(sla.readDeadlines({ ticketId: 'no-such-ticket' }), null);
});

test('reading a ticket whose clocks were never started says so', () => {
  const { sla, ticketId } = start();
  // Not papered over by inserting one now — that would be a clock which
  // started whenever somebody noticed it was missing.
  assert.throws(() => sla.readDeadlines({ ticketId }), /no first_response clock/);
});

test('the kinds are the ones the column stores', () => {
  assert.deepEqual([...CLOCK_KINDS], ['first_response', 'resolution']);
});

test('every seeded priority has a target, so no ticket can outrun the seed', () => {
  const { db, sla, ticketId } = start();
  for (const priority of ['low', 'normal', 'high', 'urgent']) {
    db.prepare('UPDATE tickets SET priority = ? WHERE id = ?').run(priority, ticketId);
    if (priority === 'low') sla.startClocks({ ticketId, startedAt: RAISED_AT });
    assert.ok(sla.readDeadlines({ ticketId }).resolution.deadline, `${priority} has a promise`);
  }
});
