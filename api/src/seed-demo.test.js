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
  // One row per raise and one per move — plus what a reply causes, which is
  // more than one: T-2 opens a `new` ticket when the desk first answers, so a
  // reply writes its own row AND a status row. And the sweep that follows the
  // walk writes its own (SERVICE-LEVELS-5-API), for the breaches it records
  // and the priorities it raises.
  //
  // So this counts what the WALK produced rather than everything on the
  // table: rows written directly would produce none of these, which is the
  // difference this story exists to make, and that is still what is asserted.
  const walkVerbs = "('ticket.create', 'ticket.assign', 'ticket.status', 'ticket.reply')";
  const audited = db
    .prepare(`SELECT count(*) AS n FROM audit_events WHERE entity = 'ticket' AND verb IN ${walkVerbs}`)
    .get().n;
  const moves = demoTickets.reduce(
    (n, f) => n + 1 + f.walk.length + f.walk.filter((s) => s.move === 'reply').length,
    0,
  );
  assert.equal(audited, moves);
});

test('the actor on every audit row is a real person, or is honestly nobody', () => {
  const { db, admin } = seeded();
  const byVerb = rows(db, "SELECT verb, actor_id FROM audit_events WHERE entity = 'ticket'");

  // "The seed did it" is an answer nobody can follow up. BR-2 wants an actor —
  // for everything a PERSON did.
  const walked = byVerb.filter((r) => r.verb !== 'sla.breach' && r.verb !== 'ticket.priority');
  const people = new Set(walked.map((r) => r.actor_id));
  assert.ok(people.size > 0);
  assert.ok([...people].every((id) => id === admin.id || typeof id === 'string'));

  // And the rule's own rows carry nobody, deliberately: the sweep decided
  // which promises were missed and which tickets to raise, and attributing
  // that to whoever ran it would be a false record. A null actor renders as
  // the system, which is the truth.
  const bySystem = byVerb.filter((r) => r.verb === 'sla.breach' || r.verb === 'ticket.priority');
  assert.ok(bySystem.length > 0, 'the demo shows the escalation having run');
  assert.ok(bySystem.every((r) => r.actor_id === null));
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

// SERVICE-LEVELS-5-API (CRM-114): the seeded database is one where the
// escalation has already run.
test('the demo seed leaves a system where a promise was missed and acted on', () => {
  const db = openDatabase(':memory:');
  seed(db);
  const { breached } = seedDemo(db, { now: () => NOW });

  const breaches = db.prepare('SELECT kind FROM sla_breaches ORDER BY kind').all().map((b) => b.kind);
  assert.ok(breaches.length > 0, 'somebody opening the product sees the feature, not an empty table');
  assert.equal(breached, breaches.length);

  // A resolution breach escalated: the priority rose and the admins were told.
  const escalations = db.prepare('SELECT count(*) AS n FROM escalations').get().n;
  assert.equal(escalations, breaches.filter((k) => k === 'resolution').length);
  const admins = db.prepare("SELECT count(*) AS n FROM users WHERE role = 'admin' AND deleted_at IS NULL").get().n;
  assert.equal(
    db.prepare("SELECT count(*) AS n FROM notifications WHERE kind = 'sla.escalated'").get().n,
    escalations * admins,
  );
});

test('the breach was produced by the sweep, not written into the table', () => {
  const db = openDatabase(':memory:');
  seed(db);
  seedDemo(db, { now: () => NOW });

  // Every breach has an audit row from the code path that made it. A fixture
  // inserted straight into `sla_breaches` would prove the fixture: the demo
  // would survive a bug the product would not.
  const breaches = db.prepare('SELECT ticket_id, kind FROM sla_breaches').all();
  const recorded = db.prepare("SELECT entity_id FROM audit_events WHERE verb = 'sla.breach'").all();
  assert.equal(recorded.length, breaches.length);
  // And the escalation left its own trail, attributed to nobody.
  const raised = db.prepare("SELECT actor_id FROM audit_events WHERE verb = 'ticket.priority'").all();
  assert.ok(raised.length > 0);
  assert.ok(raised.every((r) => r.actor_id === null));
});

test('seeding twice leaves exactly what seeding once left', () => {
  const db = openDatabase(':memory:');
  seed(db);
  seedDemo(db, { now: () => NOW });
  const once = {
    breaches: db.prepare('SELECT count(*) AS n FROM sla_breaches').get().n,
    escalations: db.prepare('SELECT count(*) AS n FROM escalations').get().n,
    notifications: db.prepare('SELECT count(*) AS n FROM notifications').get().n,
    priorities: db.prepare('SELECT id, priority FROM tickets ORDER BY id').all(),
  };

  seed(db);
  const again = seedDemo(db, { now: () => NOW });

  assert.equal(again.skipped, true, 'a queue that already has rows is left alone');
  assert.equal(db.prepare('SELECT count(*) AS n FROM sla_breaches').get().n, once.breaches);
  assert.equal(db.prepare('SELECT count(*) AS n FROM escalations').get().n, once.escalations);
  assert.equal(db.prepare('SELECT count(*) AS n FROM notifications').get().n, once.notifications);
  assert.deepEqual(db.prepare('SELECT id, priority FROM tickets ORDER BY id').all(), once.priorities);
});

test('the demo looks the same on any day', () => {
  const one = openDatabase(':memory:');
  seed(one);
  seedDemo(one, { now: () => NOW });

  const other = openDatabase(':memory:');
  seed(other);
  seedDemo(other, { now: () => NOW + 365 * 24 * 3600 });

  // Every timestamp is relative to the seed's own `now`, so a demo built a
  // year later has the same shape — the same tickets late by the same margins.
  // A seed that read the machine's date would drift into a demo where
  // everything is overdue.
  const shape = (db) => db.prepare(`
    SELECT t.subject, b.kind FROM sla_breaches b JOIN tickets t ON t.id = b.ticket_id
     ORDER BY t.subject, b.kind
  `).all();
  assert.deepEqual(shape(other), shape(one));
});

test('the desk answered everybody it worked on', () => {
  const db = openDatabase(':memory:');
  seed(db);
  seedDemo(db, { now: () => NOW });

  // Every ticket that was assigned to somebody has a reply on it. Without
  // this the sweep found six of seven tickets late on their first response —
  // a demo saying the desk never answered anybody, which misrepresents the
  // product it exists to show.
  const worked = db.prepare('SELECT id, subject FROM tickets WHERE assignee_id IS NOT NULL').all();
  assert.ok(worked.length > 0);
  for (const ticket of worked) {
    const replies = db.prepare(
      "SELECT count(*) AS n FROM ticket_messages WHERE ticket_id = ? AND kind = 'public'",
    ).get(ticket.id).n;
    assert.ok(replies > 0, `${ticket.subject} was worked on and never answered`);
  }
});
