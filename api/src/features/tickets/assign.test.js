// Proves scripts/criteria/tickets.md section TICKETS-3-API, and with it BR-5's
// first implementation in this product — three more writes copy this shape.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'assign-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
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
  const raise = async () =>
    (await (await call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Needs an owner', body: 'Body.' },
    })).json());
  const staffId = db.prepare("SELECT id FROM users WHERE role = 'agent' AND deleted_at IS NULL LIMIT 1").get().id;
  const assign = (id, body, tok = token) =>
    call(`/api/v1/tickets/${id}/assignee`, { method: 'PATCH', body, tok });
  const auditCount = () => db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  return { db, call, raise, assign, staffId, auditCount, signInAs, token };
}

test('assigning names the assignee and moves the revision on', async () => {
  const { raise, assign, staffId } = await start();
  const ticket = await raise();
  assert.equal(ticket.assigneeId, null);
  assert.equal(ticket.revision, 1);

  const res = await assign(ticket.id, { assigneeId: staffId, revision: ticket.revision });
  assert.equal(res.status, 200);
  const assigned = await res.json();
  assert.equal(assigned.assigneeId, staffId);
  // The revision the next write must send.
  assert.equal(assigned.revision, 2);
});

test('a stale revision is refused, and changes nothing', async () => {
  const { db, raise, assign, staffId } = await start();
  const ticket = await raise();
  const other = db.prepare("SELECT id FROM users WHERE id != ? AND deleted_at IS NULL LIMIT 1").get(staffId).id;

  // Two people read revision 1. The first assignment wins.
  await assign(ticket.id, { assigneeId: staffId, revision: 1 });

  // The second still holds revision 1 — which is exactly the silent overwrite
  // BR-5 forbids, and the only reason it is caught is that the check is in the
  // WHERE clause rather than in JavaScript.
  const late = await assign(ticket.id, { assigneeId: other, revision: 1 });
  assert.equal(late.status, 409);
  assert.equal((await late.json()).code, 'REVISION_MISMATCH');

  const row = db.prepare('SELECT assignee_id, revision FROM tickets WHERE id = ?').get(ticket.id);
  assert.equal(row.assignee_id, staffId, 'the first assignment stands');
  assert.equal(row.revision, 2, 'and the refusal did not bump it');
});

test('retrying with the revision the refusal implies works', async () => {
  const { db, raise, assign, staffId } = await start();
  const ticket = await raise();
  const other = db.prepare("SELECT id FROM users WHERE id != ? AND deleted_at IS NULL LIMIT 1").get(staffId).id;
  await assign(ticket.id, { assigneeId: staffId, revision: 1 });

  // A 409 is not a dead end: re-read, and try again with what you find.
  const current = await (await assign(ticket.id, { assigneeId: other, revision: 2 })).json();
  assert.equal(current.assigneeId, other);
  assert.equal(current.revision, 3);
});

test('a ticket may return to nobody', async () => {
  const { db, raise, assign, staffId } = await start();
  const ticket = await raise();
  const assigned = await (await assign(ticket.id, { assigneeId: staffId, revision: 1 })).json();

  const cleared = await (await assign(ticket.id, { assigneeId: null, revision: assigned.revision })).json();
  assert.equal(cleared.assigneeId, null);
  assert.equal(cleared.revision, 3, 'unassigning is an assignment, and moves the revision like one');
  assert.equal(db.prepare('SELECT count(*) AS n FROM tickets WHERE id = ?').get(ticket.id).n, 1, 'and is not a delete');
});

test('the audit row says where it came from as well as where it went', async () => {
  const { db, raise, assign, staffId } = await start();
  const ticket = await raise();
  await assign(ticket.id, { assigneeId: staffId, revision: 1 });
  await assign(ticket.id, { assigneeId: null, revision: 2 });

  const rows = db
    .prepare("SELECT verb, diff FROM audit_events WHERE entity = 'ticket' AND verb = 'ticket.assign' ORDER BY rowid ASC")
    .all();
  assert.equal(rows.length, 2);

  const first = JSON.parse(rows[0].diff);
  assert.equal(first.before.assigneeId, null);
  assert.equal(first.after.assigneeId, staffId);

  // Without `before`, this row could not answer "who took it off me".
  const second = JSON.parse(rows[1].diff);
  assert.equal(second.before.assigneeId, staffId);
  assert.equal(second.after.assigneeId, null);
});

test('an assignee who is not live staff is refused, naming the field', async () => {
  const { db, raise, assign, staffId, auditCount } = await start();
  const ticket = await raise();
  const before = auditCount();

  const nobody = await assign(ticket.id, { assigneeId: 'no-such-person', revision: 1 });
  assert.equal(nobody.status, 422);
  assert.deepEqual((await nobody.json()).fields, ['assigneeId']);

  // The schema cannot check this — assignee_id has no foreign key, and says so.
  db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?').run('2026-08-29', staffId);
  const disabled = await assign(ticket.id, { assigneeId: staffId, revision: 1 });
  assert.equal(disabled.status, 422);

  assert.equal(db.prepare('SELECT assignee_id FROM tickets WHERE id = ?').get(ticket.id).assignee_id, null);
  assert.equal(auditCount(), before, 'a refusal writes no audit row');
});

test('a missing revision is refused — BR-5 is not optional', async () => {
  const { raise, assign, staffId } = await start();
  const ticket = await raise();

  for (const body of [{ assigneeId: staffId }, { assigneeId: staffId, revision: 'one' }, { assigneeId: staffId, revision: 0 }]) {
    const res = await assign(ticket.id, body);
    assert.equal(res.status, 422, `${JSON.stringify(body)} should be refused`);
    assert.deepEqual((await res.json()).fields, ['revision']);
  }
});

test('a ticket that is not there is 404', async () => {
  const { db, raise, assign, staffId } = await start();
  assert.equal((await assign('no-such-ticket', { assigneeId: staffId, revision: 1 })).status, 404);

  const ticket = await raise();
  db.prepare('UPDATE tickets SET deleted_at = ? WHERE id = ?').run('2026-08-29', ticket.id);
  assert.equal((await assign(ticket.id, { assigneeId: staffId, revision: 1 })).status, 404);
});

test('assigning changes the assignee and nothing else on the row', async () => {
  const { db, raise, assign, staffId } = await start();
  const ticket = await raise();
  const before = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);

  await assign(ticket.id, { assigneeId: staffId, revision: 1 });
  const after = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);

  for (const column of ['status', 'priority', 'subject', 'body', 'customer_id', 'category_id', 'created_at']) {
    assert.equal(after[column], before[column], `${column} must not move`);
  }
});

test('an agent may assign — this is not admin-only', async () => {
  const { call, raise, assign, staffId, signInAs, token } = await start();
  const { initialPassword } = await (await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'assigner@support-desk.local', name: 'Assigner', role: 'agent' },
    tok: token,
  })).json();
  const agent = await signInAs('assigner@support-desk.local', initialPassword);
  const ticket = await raise();

  assert.equal((await assign(ticket.id, { assigneeId: staffId, revision: 1 }, agent)).status, 200);
});

test('no token is 401', async () => {
  const { raise, assign, staffId } = await start();
  const ticket = await raise();
  assert.equal((await assign(ticket.id, { assigneeId: staffId, revision: 1 }, null)).status, 401);
});
