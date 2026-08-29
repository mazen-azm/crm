// Proves scripts/criteria/platform.md section PLATFORM-17-API.
//
// The criteria are about coverage — every status, every priority, some
// unassigned, some past their promise — and coverage is exactly what drifts as
// a fixture list is edited. So these assert it rather than trusting the file to
// stay balanced.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase } from './platform/db/connection.js';
import { seed } from './platform/db/seed.js';
import { seedDemo } from './seed-demo.js';
import { demoTickets } from './seed-demo.data.js';
import { STATUSES, PRIORITIES } from './features/tickets/tickets.rules.js';

const NOW = 1_800_000_000;

function seeded() {
  const db = openDatabase(':memory:');
  const { adminEmail } = seed(db);
  const admin = db.prepare('SELECT id, role FROM users WHERE email = ?').get(adminEmail);
  const result = seedDemo(db, { now: () => NOW, actor: { id: admin.id, role: admin.role } });
  return { db, result, admin };
}

const rows = (db, sql) => db.prepare(sql).all();

test('every status the machine knows appears in the queue', () => {
  const { db } = seeded();
  const present = new Set(rows(db, 'SELECT DISTINCT status FROM tickets').map((r) => r.status));
  // A demo that never shows `closed` or `reopened` is a demo of half the
  // machine, and those two are only reachable through `resolved` — which needs
  // a note. So this failing means the walk stopped being a real walk.
  assert.deepEqual([...STATUSES].filter((s) => !present.has(s)), []);
});

test('every priority appears', () => {
  const { db } = seeded();
  const present = new Set(rows(db, 'SELECT DISTINCT priority FROM tickets').map((r) => r.priority));
  assert.deepEqual([...PRIORITIES].filter((p) => !present.has(p)), []);
});

test('some tickets are unassigned, and some are assigned', () => {
  const { db } = seeded();
  const none = db.prepare('SELECT count(*) AS n FROM tickets WHERE assignee_id IS NULL').get().n;
  const some = db.prepare('SELECT count(*) AS n FROM tickets WHERE assignee_id IS NOT NULL').get().n;
  // Both halves: an all-unassigned queue and an all-assigned one each make one
  // of the queue's filters return everything, which demonstrates nothing.
  assert.ok(none > 0, 'the unassigned filter needs rows to find');
  assert.ok(some > 0, 'the assignee filter needs rows to find');
});

test('some tickets are already past their promise', () => {
  const { db } = seeded();
  // The urgent one was raised 26 hours ago against a one-hour response and a
  // four-hour resolution promise (S-2). If nothing is overdue, every
  // service-level screen renders empty and demonstrates nothing.
  // Against the seed's own clock, not the wall clock: the fixtures are placed
  // relative to whatever `now` they were seeded with, and comparing them to a
  // real 'now' measures the gap between the two rather than the promise.
  const overdue = db.prepare(`
    SELECT count(*) AS n
      FROM tickets t
      JOIN sla_targets s ON s.priority = t.priority
     WHERE t.status NOT IN ('resolved', 'closed')
       AND (? - strftime('%s', t.created_at)) / 60 > s.resolution_minutes
  `).get(NOW).n;
  assert.ok(overdue > 0, 'no ticket is past its resolution promise');
});

test('a resolved ticket carries the note the machine demanded', () => {
  const { db } = seeded();
  const resolved = rows(db, "SELECT resolution_note FROM tickets WHERE status IN ('resolved', 'closed', 'reopened')");
  assert.ok(resolved.length > 0);
  // T-4 is enforced by the service, so this passing is evidence the walk went
  // through it rather than around it.
  for (const row of resolved) {
    assert.ok(row.resolution_note && row.resolution_note.trim() !== '', 'a resolved ticket with no note means the walk bypassed the service');
  }
});

test('every move left an audit row, which is what proves the walk was real', () => {
  const { db } = seeded();
  const moves = demoTickets.reduce((n, f) => n + 1 + f.walk.length, 0);
  const audited = db.prepare("SELECT count(*) AS n FROM audit_events WHERE entity = 'ticket'").get().n;
  // One row per raise and one per move. Rows written directly would produce
  // none of these, which is the difference this story exists to make.
  assert.equal(audited, moves);
});

test('the actor on every audit row is a real person', () => {
  const { db, admin } = seeded();
  const actors = new Set(rows(db, "SELECT DISTINCT actor_id FROM audit_events WHERE entity = 'ticket'").map((r) => r.actor_id));
  // "The seed did it" is an answer nobody can follow up. BR-2 wants an actor.
  assert.deepEqual([...actors], [admin.id]);
});

test('the subjects are written, not generated', () => {
  for (const fixture of demoTickets) {
    assert.ok(fixture.subject.length > 20, `"${fixture.subject}" is too short to be a real subject`);
    assert.ok(fixture.body.length > 80, `the body of "${fixture.subject}" is too short to be a real one`);
    // The shapes a generated fixture takes. A demo is the first thing anybody
    // sees, and "Ticket 7" tells them they are looking at a fixture.
    assert.doesNotMatch(fixture.subject, /^(ticket|test|sample|example|lorem)\b/i);
    assert.doesNotMatch(fixture.subject, /\b\d+$/);
  }
  const subjects = new Set(demoTickets.map((f) => f.subject));
  assert.equal(subjects.size, demoTickets.length, 'two fixtures share a subject');
});

test('seeding twice does not double the queue', () => {
  const { db, result, admin } = seeded();
  assert.equal(result.skipped, false);
  assert.equal(result.seeded, demoTickets.length);

  const again = seedDemo(db, { now: () => NOW, actor: { id: admin.id, role: admin.role } });
  // Tickets have no natural unique key, so the conflict clause that makes the
  // reference seed safe does not transfer. The guard is coarse and says so.
  assert.equal(again.skipped, true);
  assert.equal(db.prepare('SELECT count(*) AS n FROM tickets').get().n, demoTickets.length);
});

test('a fixture naming somebody the reference seed does not have fails loudly', () => {
  const db = openDatabase(':memory:');
  const { adminEmail } = seed(db);
  const admin = db.prepare('SELECT id, role FROM users WHERE email = ?').get(adminEmail);
  db.exec("DELETE FROM ticket_categories WHERE name = 'Billing'");

  // Silence here would mean a demo quietly missing a category, which is the
  // sort of thing nobody notices until they are demonstrating.
  assert.throws(
    () => seedDemo(db, { now: () => NOW, actor: { id: admin.id, role: admin.role } }),
    /no category named "Billing"/,
  );
});
