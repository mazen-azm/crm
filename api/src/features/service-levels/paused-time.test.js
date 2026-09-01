// Proves scripts/criteria/service-levels.md section SERVICE-LEVELS-2-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'paused-time-secret';
const HOUR = 60 * 60;
const servers = [];
after(() => servers.forEach((s) => s.close()));

const movable = (from = 1_800_000_000) => {
  let at = from;
  const now = () => at;
  now.advanceHours = (hours) => { at += hours * HOUR; };
  return now;
};

async function start(now = movable()) {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = () =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
  const admin = (path, init = {}) =>
    signIn().then((r) => r.json()).then(({ token }) =>
      fetch(`${url}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      }));

  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async () =>
    (await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.', priority: 'normal' },
    })).json());

  const move = async (ticket, status, note) =>
    (await (await admin(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status, revision: ticket.revision, ...(note ? { note } : {}) },
    })).json());

  const clock = (ticketId, kind = 'resolution') =>
    db.prepare('SELECT * FROM sla_clocks WHERE ticket_id = ? AND kind = ?').get(ticketId, kind);
  const deadlines = (ticketId) =>
    db.prepare('SELECT * FROM sla_clocks WHERE ticket_id = ?').all(ticketId);

  return { db, now, admin, raise, move, clock, deadlines, url };
}

test('entering pending pauses the resolution clock, and leaving adds what it cost', async () => {
  const now = movable();
  const { raise, move, clock } = await start(now);
  const ticket = await raise();

  const pending = await move(ticket, 'pending');
  assert.ok(clock(ticket.id).pause_started_at, 'the pause is open');
  assert.equal(clock(ticket.id).paused_ms, 0, 'and nothing is added until it closes');

  now.advanceHours(3);
  await move(pending, 'open');

  // Three hours, exactly. The clock is whole seconds and the arithmetic is
  // integer, so this is not "about" three hours.
  assert.equal(clock(ticket.id).paused_ms, 3 * HOUR * 1000);
  assert.equal(clock(ticket.id).pause_started_at, null, 'and the pause is closed');
});

test('a ticket waiting on the customer does not go overdue while it waits', async () => {
  const now = movable();
  const { db, raise, move } = await start(now);
  const ticket = await raise();
  await move(ticket, 'pending');

  // `normal` promises resolution in 72 hours (S-2). Four days pass, every hour
  // of it waiting on the customer.
  now.advanceHours(96);

  const { createServiceLevels } = await import('./service-levels.service.js');
  const sla = createServiceLevels({ db, now });
  const { resolution } = sla.readDeadlines({ ticketId: ticket.id });

  // Not overdue. This is the case the whole rule is for and the one a plan is
  // most likely to miss: the pause is still OPEN, so nothing has been added to
  // the total yet, and a deadline that only counted closed pauses would report
  // this ticket late for exactly as long as it waits on somebody else. It is
  // also the common case — the queue is read WHILE tickets are waiting.
  assert.equal(resolution.overdue, false);
  // And the deadline has moved out by what the pause has cost so far.
  assert.equal(resolution.pausedMs, 96 * HOUR * 1000);
});

test('the first-response clock is not touched by pending', async () => {
  const now = movable();
  const { raise, move, clock } = await start(now);
  const ticket = await raise();

  const pending = await move(ticket, 'pending');
  now.advanceHours(5);
  await move(pending, 'open');

  // Pending means waiting on the customer, which can only happen after
  // somebody answered them. A promise about answering that could be paused by
  // the answer is not a promise, and S-4 names the resolution clock.
  const first = clock(ticket.id, 'first_response');
  assert.equal(first.paused_ms, 0);
  assert.equal(first.pause_started_at, null);
});

test('a ticket resolved while still pending counts the pause first', async () => {
  const now = movable();
  const { raise, move, clock } = await start(now);
  const ticket = await raise();
  const pending = await move(ticket, 'pending');

  now.advanceHours(2);
  await move(pending, 'resolved', 'We fixed it.');

  // Two hours added, and the pause closed. A clock stopped mid-pause with the
  // pause never counted would make the resolution look slower than it was —
  // the opposite of what S-4 is for.
  const row = clock(ticket.id);
  assert.equal(row.paused_ms, 2 * HOUR * 1000);
  assert.equal(row.pause_started_at, null);

  // NOT asserted here: that the resolution clock stopped. It does not —
  // nothing stops it, on any path. That was found while building this story
  // and it belongs to SERVICE-LEVELS-3-API (CRM-110), whose own criterion is
  // that "a clock that stopped before its deadline records nothing": that
  // sentence needs stopping to work, and until it does, a breach sweep would
  // record one against every resolved ticket. Written into CRM-110's intake
  // rather than fixed here, because this story is S-4 and a fix that arrived
  // without a criterion is a fix nobody can check.
});

test('two visits to pending both count', async () => {
  const now = movable();
  const { raise, move, clock } = await start(now);
  const ticket = await raise();

  let held = await move(ticket, 'pending');
  now.advanceHours(1);
  held = await move(held, 'open');
  now.advanceHours(10);
  held = await move(held, 'pending');
  now.advanceHours(2);
  await move(held, 'open');

  // Three hours total. The column is a total, and a second visit that
  // overwrote the first would quietly hand the first one back.
  assert.equal(clock(ticket.id).paused_ms, 3 * HOUR * 1000);
});

test('the pause is stored as it accrues, not worked out from the trail on read', async () => {
  const now = movable();
  const { db, raise, move, clock } = await start(now);
  const ticket = await raise();
  const pending = await move(ticket, 'pending');
  now.advanceHours(4);
  await move(pending, 'open');

  const stored = clock(ticket.id).paused_ms;
  // Delete every status row from the trail. If the total were derived, it
  // would now be wrong; because it is stored, it is not.
  db.prepare("DELETE FROM audit_events WHERE verb = 'ticket.status'").run();

  assert.equal(clock(ticket.id).paused_ms, stored);
  assert.equal(stored, 4 * HOUR * 1000);
});

test('the unit is milliseconds, and this is where that is written down', async () => {
  const now = movable();
  const { raise, move, clock } = await start(now);
  const ticket = await raise();
  const pending = await move(ticket, 'pending');
  now.advanceHours(1);
  await move(pending, 'open');

  // The column is `paused_ms` and it holds milliseconds. Every duration in
  // this feature is milliseconds — the deadline is
  // `Date.parse(started_at) + minutes * 60_000` compared against
  // `now() * 1000` — and a duration belongs in the unit its arithmetic uses.
  //
  // One hour is 3600000, not 3600. A factor of a thousand discovered later is
  // a factor of a thousand in a promise about time, which is why this is an
  // assertion rather than a comment.
  assert.equal(clock(ticket.id).paused_ms, 3_600_000);
});

test('moving between other statuses pauses nothing', async () => {
  const now = movable();
  const { raise, move, clock } = await start(now);
  const ticket = await raise();

  const open = await move(ticket, 'open');
  now.advanceHours(3);
  await move(open, 'resolved', 'We fixed it.');

  // S-3: the clocks run continuously. Only `pending` pauses, and only because
  // S-4 says so.
  assert.equal(clock(ticket.id).paused_ms, 0);
});
