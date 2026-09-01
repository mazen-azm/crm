// Proves scripts/criteria/service-levels.md section SERVICE-LEVELS-4-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'escalation-secret';
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

  const admin = (path, init = {}) =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    })
      .then((r) => r.json())
      .then(({ token }) =>
        fetch(`${url}${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(init.body ? { body: JSON.stringify(init.body) } : {}),
        }));

  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async (priority) =>
    (await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.', priority },
    })).json());

  const sweep = () => admin('/api/v1/tickets/sweep-breaches', { method: 'POST' });
  const ticket = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const escalations = () => db.prepare('SELECT * FROM escalations').all();
  const notifications = () =>
    db.prepare("SELECT * FROM notifications WHERE kind = 'sla.escalated'").all();
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();
  const adminIds = () =>
    db.prepare("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL").all().map((r) => r.id);

  return { db, now, admin, raise, sweep, ticket, escalations, notifications, audit, adminIds };
}

// `urgent` is 4h resolution; `low` is 168h. Sweeping after 200 hours puts every
// priority past its resolution deadline.
const PAST_EVERYTHING = 200;

test('a missed resolution raises the ticket one level and tells the admins', async () => {
  const now = movable();
  const { raise, sweep, ticket, notifications, adminIds } = await start(now);
  const one = await raise('normal');

  now.advanceHours(PAST_EVERYTHING);
  await sweep();

  assert.equal(ticket(one.id).priority, 'high', 'normal → high, one level');
  const told = notifications().filter((n) => n.ticket_id === one.id);
  assert.equal(told.length, adminIds().length);
  assert.deepEqual(told.map((n) => n.user_id).sort(), adminIds().sort());
  assert.ok(told.every((n) => n.read_at === null), 'and unread');
});

test('the same breach never escalates twice, and the constraint is what says so', async () => {
  const now = movable();
  const { db, raise, sweep, ticket, escalations, notifications } = await start(now);
  const one = await raise('normal');
  now.advanceHours(PAST_EVERYTHING);
  await sweep();
  const after = { priority: ticket(one.id).priority, told: notifications().length };

  await sweep();
  await sweep();

  assert.equal(ticket(one.id).priority, after.priority, 'not raised a second time');
  assert.equal(notifications().length, after.told, 'and nobody told twice');
  assert.equal(escalations().length, 1);

  // Directly: two sweeps racing both find no escalation and both try. The
  // database picks one — an application check could not promise that.
  assert.throws(
    () => db.prepare(`
      INSERT INTO escalations (id, breach_id, created_at, updated_at)
      VALUES ('x', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
    `).run(escalations()[0].breach_id),
    /UNIQUE/,
  );
});

test('an urgent ticket is still told about, and stays urgent', async () => {
  const now = movable();
  const { raise, sweep, ticket, notifications } = await start(now);
  const one = await raise('urgent');

  now.advanceHours(PAST_EVERYTHING);
  await sweep();

  // There is no level above urgent. A rule that silently did nothing for the
  // most urgent tickets would be worst exactly where it matters most, so the
  // notification still goes and the priority stays where it is.
  assert.equal(ticket(one.id).priority, 'urgent');
  assert.ok(notifications().filter((n) => n.ticket_id === one.id).length > 0);
});

test('a first-response breach escalates nothing', async () => {
  const now = movable();
  const { raise, sweep, ticket, escalations, db } = await start(now);
  const one = await raise('low');   // 24h response, 168h resolution

  now.advanceHours(30);             // past the response, well inside the resolution
  await sweep();

  assert.deepEqual(
    db.prepare('SELECT kind FROM sla_breaches WHERE ticket_id = ?').all(one.id).map((b) => b.kind),
    ['first_response'],
  );
  // S-6 names the resolution deadline. The two promises are not
  // interchangeable, and escalating for the wrong one would raise every ticket
  // nobody had got to yet.
  assert.equal(ticket(one.id).priority, 'low');
  assert.deepEqual(escalations(), []);
});

test('the raise is attributed to nobody, and the deadlines follow the new priority', async () => {
  const now = movable();
  const { raise, sweep, audit, admin } = await start(now);
  const one = await raise('normal');
  now.advanceHours(PAST_EVERYTHING);
  await sweep();

  const raised = audit().filter((r) => r.verb === 'ticket.priority');
  assert.equal(raised.length, 1);
  // The rule decided it and the rule has no name.
  assert.equal(raised[0].actor_id, null);
  assert.deepEqual(
    [JSON.parse(raised[0].diff).before.priority, JSON.parse(raised[0].diff).after.priority],
    ['normal', 'high'],
  );

  // And the revision moved, so an agent holding the old one is refused — BR-5
  // gains no exception for a rule either.
  const queue = await (await admin('/api/v1/tickets')).json();
  assert.ok(queue.items.find((t) => t.id === one.id).revision > one.revision);
});

test('the breach that was already recorded stays recorded after the raise', async () => {
  const now = movable();
  const { raise, sweep, db } = await start(now);
  const one = await raise('normal');
  now.advanceHours(PAST_EVERYTHING);
  await sweep();
  const breach = db.prepare("SELECT * FROM sla_breaches WHERE ticket_id = ? AND kind = 'resolution'").get(one.id);

  await sweep();

  // Raising the priority gives the ticket a LATER deadline, because
  // SERVICE-LEVELS-1-API reads the priority live. The breach already recorded
  // is a fact about what happened and must not be undone by the consequence of
  // itself.
  const after = db.prepare("SELECT * FROM sla_breaches WHERE ticket_id = ? AND kind = 'resolution'").get(one.id);
  assert.deepEqual(after, breach);
});

test('with no admin on the roster the escalation still happens', async () => {
  const now = movable();
  const { db, raise, ticket, notifications, escalations } = await start(now);
  const one = await raise('normal');
  db.prepare("UPDATE users SET deleted_at = '2026-01-01T00:00:00.000Z' WHERE role = 'admin'").run();

  now.advanceHours(PAST_EVERYTHING);

  // Through the service rather than the route, and that is the point rather
  // than a convenience: the sweep route is admin-only, so with an empty admin
  // roster nobody can call it. The rule still has to hold — a cron reaching
  // the service directly, or the last admin being disabled between signing in
  // and the sweep — and the criterion is about the rule, not the door.
  const { createServiceLevels } = await import('./service-levels.service.js');
  const { createTicketsService } = await import('../tickets/index.js');
  const { createIdentityService } = await import('../identity/index.js');
  const { createNotificationsService } = await import('../notifications/index.js');
  const sla = createServiceLevels({ db, now });
  const tickets = createTicketsService({ db, serviceLevels: sla, now });
  sla.collaborators({
    tickets,
    identity: createIdentityService({ db, secret: SECRET, now }),
    notifications: createNotificationsService({ db, now }),
  });
  sla.sweepBreaches();

  // Notifying nobody is a fact about the roster, not a failure of the rule.
  // The priority still rises, and the escalation is still claimed — so nobody
  // is told twice if an admin appears tomorrow.
  assert.equal(ticket(one.id).priority, 'high');
  assert.equal(notifications().length, 0);
  assert.equal(escalations().length, 1);
});

test('every level rises by exactly one', async () => {
  const now = movable();
  const { raise, sweep, ticket } = await start(now);
  const low = await raise('low');
  const normal = await raise('normal');
  const high = await raise('high');

  now.advanceHours(PAST_EVERYTHING);
  await sweep();

  assert.deepEqual(
    [ticket(low.id).priority, ticket(normal.id).priority, ticket(high.id).priority],
    ['normal', 'high', 'urgent'],
  );
});
