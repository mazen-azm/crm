// Proves scripts/criteria/reports.md section REPORTS-1-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { STATUSES } from '../tickets/index.js';

const SECRET = 'queue-by-status-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = async (email, password) =>
    (await fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })).json();

  const { token: adminToken } = await signIn(adminEmail, adminPassword);
  const call = (path, { token = adminToken, method = 'GET', body } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const customerId = (await (await call('/api/v1/customers?limit=1')).json()).items[0].id;

  const raise = async (subject = 'Something is wrong') =>
    (await (await call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject, body: 'Body.' },
    })).json());

  const move = async (ticket, status, note) =>
    (await (await call(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status, revision: ticket.revision, ...(note ? { note } : {}) },
    })).json());

  const report = async (token = adminToken) => call('/api/v1/reports/queue-by-status', { token });

  return { db, call, signIn, raise, move, report, adminToken };
}

test('a desk with nothing on it answers six zeros, not an empty body', async () => {
  const { report } = await start();

  const res = await report();
  assert.equal(res.status, 200);
  const body = await res.json();

  // Not 404 and not {}. "There are no tickets" is an answer, and it is the
  // answer this report exists to be able to give.
  assert.deepEqual(Object.keys(body.counts).sort(), [...STATUSES].sort());
  assert.deepEqual(Object.values(body.counts), [0, 0, 0, 0, 0, 0]);
  assert.equal(body.total, 0);
});

test('every status is present, and the ones nobody is in say zero', async () => {
  const { raise, move, report } = await start();

  const first = await raise('One');
  await raise('Two');
  const third = await raise('Three');
  await move(first, 'open');
  await move(third, 'resolved', 'Fixed it.');

  const { counts, total } = await (await report()).json();

  assert.equal(counts.new, 1);
  assert.equal(counts.open, 1);
  assert.equal(counts.resolved, 1);
  // The point of the story. A GROUP BY can only return rows for statuses that
  // HAVE tickets, so these three would simply be absent — and an admin reading
  // a report to find where the desk is stuck would never see that nothing is
  // stuck here.
  assert.equal(counts.pending, 0);
  assert.equal(counts.closed, 0);
  assert.equal(counts.reopened, 0);
  assert.equal(total, 3);
});

test('a soft-deleted ticket is in no count, so the report agrees with the queue', async () => {
  const { db, raise, report } = await start();

  const gone = await raise('Deleted later');
  await raise('Still here');
  db.prepare('UPDATE tickets SET deleted_at = ? WHERE id = ?')
    .run('2026-09-02T00:00:00.000Z', gone.id);

  const { counts, total } = await (await report()).json();

  assert.equal(counts.new, 1);
  assert.equal(total, 1);
});

test('the six names are read from the tickets feature, not retyped here', async () => {
  const { report } = await start();
  const { counts } = await (await report()).json();

  // If STATUSES gains a seventh name, this assertion carries it and the report
  // does too — neither has the list written into it.
  assert.deepEqual(Object.keys(counts).sort(), [...STATUSES].sort());
});

test('the total counts every live ticket, including one the six do not name', async () => {
  const { db, raise, report } = await start();

  await raise('A normal one');
  // Written straight to the table, around the service that would refuse it.
  // The write path closes the status set, so this cannot arrive through the
  // API — and "impossible upstream" is exactly what was said about the account
  // projection that had been reporting every disabled row as live.
  const [row] = db.prepare('SELECT * FROM tickets LIMIT 1').all();
  db.prepare(`
    INSERT INTO tickets (id, customer_id, status, priority, subject, body, created_at, updated_at)
    VALUES ('odd-one', ?, 'archived', 'normal', 'Off the map', 'Body.', ?, ?)
  `).run(row.customer_id, row.created_at, row.created_at);

  const { counts, total } = await (await report()).json();

  // Counted, so the report is visibly short rather than quietly wrong. Had the
  // total been summed only over the known six it would have said 1 and agreed
  // with itself perfectly while having lost a ticket.
  assert.equal(total, 2);
  assert.equal(counts.new, 1);
  assert.ok(!Object.hasOwn(counts, 'archived'));
});

test('an agent is refused, and the reader is never entered', async () => {
  const { call, signIn, report } = await start();
  const made = await (await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'reader@support-desk.local', name: 'A Reader', role: 'agent' },
  })).json();
  const { token } = await signIn(made.user.email, made.initialPassword);

  const res = await report(token);

  // 403 from the middleware. A report is about how the whole desk is doing,
  // which is not something one agent reads about the others (SC-2).
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'FORBIDDEN');
});
