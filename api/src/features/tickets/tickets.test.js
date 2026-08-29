// Proves scripts/criteria/tickets.md section TICKETS-1-API: a ticket is raised
// for a customer, carrying what T-1 says it carries, audited and clocked in the
// same transaction as itself.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { createServiceLevels } from '../service-levels/index.js';

const SECRET = 'tickets-test-secret';
const RAISED = 1_800_000_000;
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start({ now = () => RAISED } = {}) {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signInAs = async (email, password) =>
    (await (await fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })).json()).token;

  const token = await signInAs(adminEmail, adminPassword);
  const call = (path, { method = 'GET', body, tok = token } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const customerId = (await (await call('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = (extra = {}) =>
    call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Printer is offline', body: 'It stopped after the update.', ...extra },
    });
  const auditCount = () => db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  return { db, call, raise, customerId, signInAs, token, auditCount };
}

test('a raised ticket carries what T-1 says it carries', async () => {
  const { raise, customerId } = await start();
  const res = await raise();

  assert.equal(res.status, 201);
  const ticket = await res.json();
  assert.equal(ticket.customerId, customerId);
  assert.equal(ticket.subject, 'Printer is offline');
  assert.equal(ticket.status, 'new');
  assert.equal(ticket.revision, 1, 'BR-5 needs a token from birth');
  assert.equal(ticket.assigneeId, null, 'assigning is TICKETS-3-API');
  assert.equal(ticket.categoryId, null, 'the category list is TICKETS-6-API');
  // One queue: nothing to route it to (SC-1).
  assert.ok(!('organisationId' in ticket) && !('teamId' in ticket));
  // Not ported from the first attempt: no number, no frozen deadlines.
  assert.ok(!('number' in ticket));
  assert.ok(!('responseDueAt' in ticket) && !('resolutionDueAt' in ticket));
});

test('an unstated priority is normal; a stated wrong one is refused', async () => {
  const { db, raise } = await start();

  assert.equal((await (await raise()).json()).priority, 'normal');
  assert.equal((await (await raise({ priority: 'urgent' })).json()).priority, 'urgent');

  const bad = await raise({ priority: 'medium' });
  assert.equal(bad.status, 422);
  const answer = await bad.json();
  assert.deepEqual(answer.fields, ['priority']);
  // The field name travels; the value never does.
  assert.ok(!JSON.stringify(answer).includes('medium'));
  assert.equal(db.prepare('SELECT count(*) AS n FROM tickets').get().n, 2, 'the refusal wrote nothing');
});

test('a missing subject or body is 422 naming the fields', async () => {
  const { db, raise } = await start();
  const res = await raise({ subject: '   ', body: '' });
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['subject', 'body']);
  assert.equal(db.prepare('SELECT count(*) AS n FROM tickets').get().n, 0);
});

test('a customer who is gone is 404, and nothing is written', async () => {
  const { db, call, raise, customerId, auditCount } = await start();
  db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run('2026-08-29', customerId);
  const before = auditCount();

  assert.equal((await raise()).status, 404);
  assert.equal(
    (await call('/api/v1/tickets', { method: 'POST', body: { customerId: 'no-such-customer', subject: 'x', body: 'y' } })).status,
    404,
  );
  assert.equal(db.prepare('SELECT count(*) AS n FROM tickets').get().n, 0);
  assert.equal(auditCount(), before, 'a refusal writes no audit row');
});

test('the ticket and its audit row are written together', async () => {
  const { db, raise, auditCount } = await start();
  const before = auditCount();
  const ticket = await (await raise()).json();

  assert.equal(auditCount(), before + 1);
  const row = db.prepare('SELECT entity, entity_id, verb FROM audit_events ORDER BY rowid DESC LIMIT 1').get();
  assert.equal(row.entity, 'ticket');
  assert.equal(row.entity_id, ticket.id);
  // Namespaced by its entity, as identity and customers write theirs.
  assert.equal(row.verb, 'ticket.create');
});

test('both service-level clocks start at the ticket, not at whenever', async () => {
  const { db, raise } = await start();
  const ticket = await (await raise({ priority: 'urgent' })).json();

  const clocks = db
    .prepare('SELECT kind, started_at FROM sla_clocks WHERE ticket_id = ? ORDER BY kind')
    .all(ticket.id);
  assert.deepEqual(clocks.map((c) => c.kind), ['first_response', 'resolution']);
  for (const clock of clocks) assert.equal(clock.started_at, ticket.createdAt, 'S-1');
});

test('the deadlines follow from the priority the ticket was given', async () => {
  const { db, raise } = await start();
  const ticket = await (await raise({ priority: 'urgent' })).json();

  // Read through the service-levels feature, the way a screen eventually will.
  const seen = createServiceLevels({ db, now: () => RAISED }).readDeadlines({ ticketId: ticket.id });
  const target = db
    .prepare("SELECT first_response_minutes f, resolution_minutes r FROM sla_targets WHERE priority = 'urgent'")
    .get();
  assert.equal(seen.first_response.deadline, new Date((RAISED + target.f * 60) * 1000).toISOString());
  assert.equal(seen.resolution.deadline, new Date((RAISED + target.r * 60) * 1000).toISOString());
  assert.equal(seen.first_response.overdue, false);
});

test('if the audit write fails, the ticket does not exist', async () => {
  // The one test that distinguishes "wrote both" from "wrote both atomically".
  // Counting rows cannot: hoisting the work out of transact still writes the
  // ticket and still writes the audit row, so the counts agree and nothing
  // complains. Forcing a failure between them is what tells them apart — and
  // the audit guard cannot, because it is inert outside a transaction by
  // design, so that the seed and the migration runner can write there.
  const { db, raise } = await start();
  const before = db.prepare('SELECT count(*) AS n FROM tickets').get().n;

  const insert = db.prepare.bind(db);
  db.prepare = (sql) => {
    if (String(sql).includes('INSERT INTO audit_events')) {
      throw new Error('audit unavailable');
    }
    return insert(sql);
  };
  try {
    await raise();
  } finally {
    db.prepare = insert;
  }

  assert.equal(db.prepare('SELECT count(*) AS n FROM tickets').get().n, before, 'rolled back with it');
  assert.equal(db.prepare('SELECT count(*) AS n FROM sla_clocks').get().n, 0, 'and so did the clocks');
});

test('a category may be given, and is optional', async () => {
  const { db, raise } = await start();
  const categoryId = db.prepare('SELECT id FROM ticket_categories LIMIT 1').get().id;

  assert.equal((await (await raise({ categoryId })).json()).categoryId, categoryId);
  assert.equal((await (await raise()).json()).categoryId, null);
});

test('an agent may raise one — this is not admin-only', async () => {
  const { call, raise, customerId, signInAs, token } = await start();
  const { initialPassword } = await (await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'raiser@support-desk.local', name: 'Raiser', role: 'agent' },
    tok: token,
  })).json();
  const agent = await signInAs('raiser@support-desk.local', initialPassword);

  const res = await call('/api/v1/tickets', {
    method: 'POST',
    body: { customerId, subject: 'From an agent', body: 'Raised by somebody who is not an admin.' },
    tok: agent,
  });
  assert.equal(res.status, 201);
  void raise;
});

test('no token is 401', async () => {
  const { call, customerId } = await start();
  const res = await call('/api/v1/tickets', {
    method: 'POST',
    body: { customerId, subject: 'x', body: 'y' },
    tok: null,
  });
  assert.equal(res.status, 401);
});
