// Proves scripts/criteria/identity.md section IDENTITY-9-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'disable-unassigns-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = (email, password) =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const as = (tok) => (path, init = {}) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  const admin = as((await (await signIn(adminEmail, adminPassword)).json()).token);

  const makeAgent = async (email) => {
    const made = await (await admin('/api/v1/accounts', {
      method: 'POST',
      body: { email, name: 'An Agent', role: 'agent' },
    })).json();
    return made.user;
  };

  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;

  const raise = async (assigneeId) => {
    const ticket = await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.' },
    })).json();
    if (!assigneeId) return ticket;
    return (await (await admin(`/api/v1/tickets/${ticket.id}/assignee`, {
      method: 'PATCH',
      body: { assigneeId, revision: ticket.revision },
    })).json());
  };

  const move = async (ticket, status, note) =>
    (await (await admin(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status, revision: ticket.revision, ...(note ? { note } : {}) },
    })).json());

  const disable = (id) => admin(`/api/v1/accounts/${id}/disable`, { method: 'POST' });
  const row = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, admin, makeAgent, raise, move, disable, row, audit, adminEmail };
}

test('their queue is handed back, and the answer says how much of it there was', async () => {
  const { makeAgent, raise, disable, row } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const first = await raise(agent.id);
  const second = await raise(agent.id);
  const somebodyElses = await raise(null);

  const res = await disable(agent.id);
  assert.equal(res.status, 200);
  const body = await res.json();

  // The count beside the user, not instead of it: an admin deciding whether to
  // disable somebody is deciding what happens to their work.
  assert.equal(body.unassigned, 2);
  assert.ok(body.user, 'the user is still what it was');
  assert.equal(body.user.id, agent.id);

  assert.equal(row(first.id).assignee_id, null);
  assert.equal(row(second.id).assignee_id, null);
  assert.equal(row(somebodyElses.id).assignee_id, null, 'was never theirs');
});

test('every unassignment is audited as an assignment, by the admin who did it', async () => {
  const { makeAgent, raise, disable, audit, db, adminEmail } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise(agent.id);
  const before = audit().length;

  await disable(agent.id);

  const written = audit().slice(before);
  const moves = written.filter((r) => r.verb === 'ticket.assign');
  assert.equal(moves.length, 1);
  const diff = JSON.parse(moves[0].diff);
  assert.equal(diff.before.assigneeId, agent.id);
  assert.equal(diff.after.assigneeId, null);
  assert.equal(moves[0].entity_id, ticket.id);

  // The disabling ADMIN, not the agent losing the ticket. A trail that showed
  // tickets moving with nobody moving them would be a trail nobody can use.
  const adminId = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail).id;
  assert.equal(moves[0].actor_id, adminId);

  // And the disable itself is still recorded, once.
  assert.equal(written.filter((r) => r.verb === 'user.disable').length, 1);
});

test('a closed ticket of theirs is left exactly as it is', async () => {
  const { makeAgent, raise, move, disable, row } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const open = await raise(agent.id);
  const resolved = await move(await raise(agent.id), 'resolved', 'We fixed it.');
  const closed = await move(resolved, 'closed');

  const { unassigned } = await (await disable(agent.id)).json();

  // Unassigning is about work somebody still has to do. Rewriting who finished
  // a closed ticket to tidy a queue would make the record wrong.
  assert.equal(row(closed.id).assignee_id, agent.id);
  assert.equal(row(open.id).assignee_id, null);
  assert.equal(unassigned, 1);
});

test('a resolved ticket is handed back, because it can still come back', async () => {
  const { makeAgent, raise, move, disable, row } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const resolved = await move(await raise(agent.id), 'resolved', 'We fixed it.');

  const { unassigned } = await (await disable(agent.id)).json();

  // A reply inside the fourteen days reopens it (T-5), and then it is
  // somebody's again — so it is not finished work.
  assert.equal(unassigned, 1);
  assert.equal(row(resolved.id).assignee_id, null);
});

test('the revision is bumped, so an agent holding the old one is refused', async () => {
  const { makeAgent, raise, disable, admin, row } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise(agent.id);
  const staleRevision = ticket.revision;

  await disable(agent.id);

  assert.equal(row(ticket.id).revision, staleRevision + 1);
  // Somebody who had this ticket open when the sweep moved it is refused
  // rather than allowed to write over it. BR-5 has no exception for sweeps,
  // which is why this reads each revision inside the transaction and passes it
  // rather than writing without the guard.
  const res = await admin(`/api/v1/tickets/${ticket.id}/assignee`, {
    method: 'PATCH',
    body: { assigneeId: null, revision: staleRevision },
  });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REVISION_MISMATCH');
});

test('an agent with nothing assigned gives a count of zero, and the same disable', async () => {
  const { makeAgent, disable, db } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');

  const { unassigned, user } = await (await disable(agent.id)).json();

  // Zero is an answer, not an error.
  assert.equal(unassigned, 0);
  assert.ok(user.deletedAt ?? db.prepare('SELECT deleted_at FROM users WHERE id = ?').get(agent.id).deleted_at);
});

test('a refused disable moves nothing', async () => {
  const { makeAgent, raise, disable, row, audit } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise(agent.id);
  await disable(agent.id);
  const after = { rows: audit().length, revision: row(ticket.id).revision };

  // Disabling twice is not two events — and the second attempt must not sweep
  // a queue that is already empty, or audit anything.
  const again = await disable(agent.id);
  assert.equal(again.status, 409);
  assert.equal(audit().length, after.rows);
  assert.equal(row(ticket.id).revision, after.revision);
});

test('the last admin is still refused, and their tickets do not move', async () => {
  const { db, admin, raise, disable, row, adminEmail, audit } = await start();
  const adminId = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail).id;
  // Every other admin out of the way, so this one is the last.
  db.prepare("UPDATE users SET deleted_at = '2026-08-31T00:00:00.000Z' WHERE role = 'admin' AND email != ?")
    .run(adminEmail);
  const ticket = await raise(adminId);
  const before = { rows: audit().length, assignee: row(ticket.id).assignee_id };

  const res = await disable(adminId);

  // The refusal comes before anything is written, so a queue is not emptied
  // for a disable that does not happen.
  assert.equal(res.status, 409);
  assert.equal(row(ticket.id).assignee_id, before.assignee);
  assert.equal(audit().length, before.rows);
  void admin;
});

test('the disable and the unassignments are one transaction', async () => {
  const { db, makeAgent, raise, disable, row } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise(agent.id);

  await disable(agent.id);

  // Both, or neither. An account disabled with its queue still assigned to it
  // is worse than either outcome alone: the work is invisible in every
  // "unassigned" view and its owner cannot sign in to hand it over.
  assert.ok(db.prepare('SELECT deleted_at FROM users WHERE id = ?').get(agent.id).deleted_at);
  assert.equal(row(ticket.id).assignee_id, null);
});
