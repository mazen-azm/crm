// Proves scripts/criteria/service-levels.md section SERVICE-LEVELS-3-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'recorded-breach-secret';
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

  const signIn = (email, password) =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  const as = (email, password) => (path, init = {}) =>
    signIn(email, password).then((r) => r.json()).then(({ token }) =>
      fetch(`${url}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      }));

  const admin = as(adminEmail, adminPassword);
  const madeAgent = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'an-agent@support-desk.local', name: 'An Agent', role: 'agent' },
  })).json();
  const agent = as(madeAgent.user.email, madeAgent.initialPassword);

  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async (priority = 'normal') =>
    (await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.', priority },
    })).json());
  const move = async (ticket, status, note) =>
    (await (await admin(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status, revision: ticket.revision, ...(note ? { note } : {}) },
    })).json());
  const reply = (ticket) =>
    admin(`/api/v1/tickets/${ticket.id}/replies`, { method: 'POST', body: { body: 'Looking at it.' } });

  const sweep = (call = admin) => call('/api/v1/tickets/sweep-breaches', { method: 'POST' });
  const breaches = (ticketId) =>
    db.prepare('SELECT * FROM sla_breaches WHERE ticket_id = ? ORDER BY kind').all(ticketId);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, now, admin, agent, raise, move, reply, sweep, breaches, audit };
}

test('a missed deadline becomes a row saying which ticket, which clock, and when', async () => {
  const now = movable();
  const { raise, sweep, breaches } = await start(now);
  const ticket = await raise('urgent');   // 1h response, 4h resolution

  now.advanceHours(2);
  const res = await sweep();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).recorded, 1);

  const [written] = breaches(ticket.id);
  assert.equal(written.kind, 'first_response');
  // The moment it was MISSED, not the moment the sweep noticed. A breach
  // stamped with the sweep's own time would make every breach look like it
  // happened whenever somebody last ran a cron.
  assert.equal(written.breached_at, new Date((now() - HOUR) * 1000).toISOString());
});

test('the same clock is never recorded twice, and the constraint is what says so', async () => {
  const now = movable();
  const { db, raise, sweep, breaches, audit } = await start(now);
  const ticket = await raise('urgent');
  now.advanceHours(2);
  await sweep();

  assert.equal((await (await sweep()).json()).recorded, 0);
  now.advanceHours(10);
  assert.equal((await (await sweep()).json()).recorded, 1, 'the resolution one falls due later');

  assert.equal(breaches(ticket.id).filter((b) => b.kind === 'first_response').length, 1);
  // And directly: the constraint refuses it, not a check that ran first.
  assert.throws(
    () => db.prepare(`
      INSERT INTO sla_breaches (id, ticket_id, kind, breached_at, created_at, updated_at)
      VALUES ('x', ?, 'first_response', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
    `).run(ticket.id),
    /UNIQUE/,
  );
  void audit;
});

test('a clock that stopped in time records nothing', async () => {
  const now = movable();
  const { raise, reply, sweep, breaches } = await start(now);
  const ticket = await raise('urgent');   // 1h response

  // Answered within the hour.
  await reply(ticket);

  now.advanceHours(10);
  await sweep();

  // The first-response clock stopped when the desk replied, so no breach for
  // it however long the sweep waits afterwards. The desk answered in time;
  // there is nothing to say. (The resolution clock is still running and its
  // breach is recorded — which is the point: the two promises are separate.)
  assert.deepEqual(breaches(ticket.id).map((b) => b.kind), ['resolution']);
});

test('resolving stops the resolution clock, so a ticket answered in time never breaches', async () => {
  const now = movable();
  const { raise, reply, move, sweep, breaches, db } = await start(now);
  const ticket = await raise('urgent');
  await reply(ticket);
  const current = db.prepare('SELECT revision FROM tickets WHERE id = ?').get(ticket.id).revision;
  await move({ ...ticket, revision: current }, 'resolved', 'We fixed it.');

  now.advanceHours(100);
  await sweep();

  // Nothing stopped the resolution clock before this story. Without it, every
  // ticket the desk resolved on time would have been recorded as a breach —
  // which is the bug this criterion exists to prevent, not a hypothetical.
  assert.deepEqual(breaches(ticket.id), []);
});

test('time waiting on the customer does not make a ticket late', async () => {
  const now = movable();
  const { raise, reply, move, sweep, breaches, db } = await start(now);
  const ticket = await raise('urgent');   // 4h resolution
  await reply(ticket);

  const rev = () => db.prepare('SELECT revision FROM tickets WHERE id = ?').get(ticket.id).revision;
  await move({ ...ticket, revision: rev() }, 'pending');
  now.advanceHours(10);                    // all of it on the customer

  await sweep();

  // S-4 and S-5 have to agree, or the product blames the desk for the
  // customer's silence. The sweep computes the deadline with the same
  // expression the queue reads it with, so it cannot disagree with the screen.
  assert.deepEqual(breaches(ticket.id).map((b) => b.kind), []);
});

test('the breach is attributed to nobody, and recorded once in the trail', async () => {
  const now = movable();
  const { raise, sweep, audit } = await start(now);
  const ticket = await raise('urgent');
  const before = audit().length;

  now.advanceHours(2);
  await sweep();

  const written = audit().slice(before).filter((r) => r.verb === 'sla.breach');
  assert.equal(written.length, 1);
  assert.equal(written[0].entity_id, ticket.id);
  // The rule decided it; the rule has no name. Attributing it to whoever ran
  // the sweep would be a false record.
  assert.equal(written[0].actor_id, null);
});

test('a sweep that finds nothing writes nothing and is not an error', async () => {
  const now = movable();
  const { raise, sweep, audit } = await start(now);
  await raise('low');            // 24h response, 168h resolution
  const before = audit().length;

  const res = await sweep();

  assert.equal(res.status, 200);
  assert.equal((await res.json()).recorded, 0);
  assert.equal(audit().length, before);
});

test('the queue and the ticket read the breach rather than working it out', async () => {
  const now = movable();
  const { raise, sweep, admin, db } = await start(now);
  const ticket = await raise('urgent');
  now.advanceHours(2);
  await sweep();

  const queue = await (await admin('/api/v1/tickets')).json();
  const row = queue.items.find((t) => t.id === ticket.id);
  assert.deepEqual(row.breaches.map((b) => b.kind), ['first_response']);

  const one = await (await admin(`/api/v1/tickets/${ticket.id}`)).json();
  assert.deepEqual(one.breaches.map((b) => b.kind), ['first_response']);

  // Stored, never recomputed (S-5): delete the row and the queue stops saying
  // it, which is what "read" means and what "computed" would not.
  db.prepare('DELETE FROM sla_breaches WHERE ticket_id = ?').run(ticket.id);
  const after = await (await admin('/api/v1/tickets')).json();
  assert.deepEqual(after.items.find((t) => t.id === ticket.id).breaches, []);
});

test('the sweep is an admin’s to run', async () => {
  const now = movable();
  const { raise, sweep, agent, breaches } = await start(now);
  const ticket = await raise('urgent');
  now.advanceHours(2);

  assert.equal((await sweep(agent)).status, 403);
  assert.deepEqual(breaches(ticket.id), []);
});
