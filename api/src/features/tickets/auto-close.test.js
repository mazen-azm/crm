// Proves scripts/criteria/tickets.md section TICKETS-14-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { REOPEN_WINDOW_DAYS } from './tickets.rules.js';

const SECRET = 'auto-close-secret';
const DAY = 24 * 60 * 60;
const servers = [];
after(() => servers.forEach((s) => s.close()));

const movable = (from = 1_800_000_000) => {
  let at = from;
  const now = () => at;
  now.advanceDays = (days) => { at += days * DAY; };
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

  const as = (tok) => (path, init = {}) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  // Signed in per call: these tests move the clock past a token's life.
  const admin = (path, init) =>
    signIn(adminEmail, adminPassword).then((r) => r.json()).then(({ token }) => as(token)(path, init));

  const madeAgent = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'an-agent@support-desk.local', name: 'An Agent', role: 'agent' },
  })).json();
  const agent = (path, init) =>
    signIn(madeAgent.user.email, madeAgent.initialPassword)
      .then((r) => r.json()).then(({ token }) => as(token)(path, init));

  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;

  const raise = async () =>
    (await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.' },
    })).json());

  const move = async (ticket, status, note) =>
    (await (await admin(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status, revision: ticket.revision, ...(note ? { note } : {}) },
    })).json());

  const resolve = async () => move(await raise(), 'resolved', 'We fixed it.');
  const sweep = (call = admin) => call('/api/v1/tickets/sweep-auto-close', { method: 'POST' });
  const row = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, now, admin, agent, raise, move, resolve, sweep, row, audit };
}

test('a ticket resolved longer ago than the window closes itself', async () => {
  const now = movable();
  const { resolve, sweep, row } = await start(now);
  const resolved = await resolve();

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  const res = await sweep();

  assert.equal(res.status, 200);
  assert.equal((await res.json()).closed, 1);
  assert.equal(row(resolved.id).status, 'closed');
});

test('the two rules meet exactly: no day is both too late to reopen and not yet closed', async () => {
  const now = movable();
  const { resolve, sweep, row, admin } = await start(now);
  const resolved = await resolve();

  // Day fourteen: still reopenable, so not yet due.
  now.advanceDays(REOPEN_WINDOW_DAYS);
  assert.equal((await (await sweep()).json()).closed, 0);
  assert.equal(row(resolved.id).status, 'resolved');
  const reopen = await admin(`/api/v1/tickets/${resolved.id}/status`, {
    method: 'PATCH',
    body: { status: 'reopened', revision: resolved.revision },
  });
  assert.equal(reopen.status, 200, 'day fourteen is still inside T-5');

  // And a day later, on a ticket resolved again, it is due and no longer
  // reopenable — the same constant answering both questions.
  const again = await (await admin(`/api/v1/tickets/${resolved.id}/status`, {
    method: 'PATCH',
    body: { status: 'resolved', revision: (await reopen.json()).revision, note: 'Fixed properly.' },
  })).json();
  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  assert.equal((await (await sweep()).json()).closed, 1);
  assert.equal(row(again.id).status, 'closed');
});

test('a ticket inside the window is left alone, and can still be reopened', async () => {
  const now = movable();
  const { resolve, sweep, row, audit } = await start(now);
  const resolved = await resolve();
  const before = audit().length;

  now.advanceDays(REOPEN_WINDOW_DAYS - 1);
  assert.equal((await (await sweep()).json()).closed, 0);

  assert.equal(row(resolved.id).status, 'resolved');
  // A sweep that closes nothing writes nothing. Most sweeps close nothing.
  assert.equal(audit().length, before);
});

test('the close is attributed to nobody, because nobody decided it', async () => {
  const now = movable();
  const { resolve, sweep, audit } = await start(now);
  const resolved = await resolve();
  const before = audit().length;

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  await sweep();

  const written = audit().slice(before);
  assert.equal(written.length, 1);
  assert.equal(written[0].verb, 'ticket.status');
  assert.equal(written[0].entity_id, resolved.id);
  // The admin who called the route chose WHEN the sweep ran, not which tickets
  // were due. Attributing the close to them would be a false record, and the
  // trail already renders a null actor as the system.
  assert.equal(written[0].actor_id, null);
  const diff = JSON.parse(written[0].diff);
  assert.deepEqual([diff.before.status, diff.after.status], ['resolved', 'closed']);
});

test('an auto-closed ticket is indistinguishable from one closed by hand', async () => {
  const now = movable();
  const { resolve, move, sweep, row } = await start(now);
  const byHand = await move(await resolve(), 'closed');
  const bySweep = await resolve();

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  await sweep();

  // Including `resolved_at`, which the status writer clears on any move away
  // from resolved. The plan for this story said the sweep must NOT clear it —
  // that would leave two kinds of closed ticket, told apart by a column, for
  // no reason anybody could state. When it was resolved lives in the audit
  // trail, which is where it belongs once the ticket is finished with.
  assert.equal(row(byHand.id).status, 'closed');
  assert.equal(row(bySweep.id).status, 'closed');
  assert.equal(row(byHand.id).resolved_at, null);
  assert.equal(row(bySweep.id).resolved_at, null);
});

test('a closed ticket is not closed again, and the sweep is idempotent', async () => {
  const now = movable();
  const { resolve, sweep, audit, row } = await start(now);
  const resolved = await resolve();
  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  await sweep();
  const after = { rows: audit().length, revision: row(resolved.id).revision };

  assert.equal((await (await sweep()).json()).closed, 0);
  assert.equal((await (await sweep()).json()).closed, 0);

  // Nothing to find: the ticket is no longer resolved. A sweep run every hour
  // by a cron must cost nothing after the first one.
  assert.equal(audit().length, after.rows);
  assert.equal(row(resolved.id).revision, after.revision);
});

test('only resolved tickets are swept, whatever their age', async () => {
  const now = movable();
  const { raise, move, sweep, row } = await start(now);
  const untouched = await raise();
  const open = await move(await raise(), 'open');
  const pending = await move(await raise(), 'pending');

  now.advanceDays(REOPEN_WINDOW_DAYS * 3);
  assert.equal((await (await sweep()).json()).closed, 0);

  // T-6 is about a resolution going stale. A ticket nobody resolved has no
  // resolution to go stale, however long it has sat there — that is a
  // different problem and no story asks this one to solve it.
  assert.equal(row(untouched.id).status, 'new');
  assert.equal(row(open.id).status, 'open');
  assert.equal(row(pending.id).status, 'pending');
});

test('the query is a guard too, not only a narrowing', async () => {
  const now = movable();
  const { db, raise, move, sweep, row } = await start(now);
  const open = await move(await raise(), 'open');

  // A row no route can produce: not resolved, but carrying a resolution
  // moment. The status writer clears `resolved_at` on every move away from
  // resolved, so this state should not exist — which is exactly why the SQL
  // asks for `status = 'resolved'` as well as for the stamp.
  //
  // Without that clause the rule alone would still refuse every ticket that
  // reaches it, because `dueForAutoClose` needs a stamp. This is the case
  // where the two disagree, and it is why the clause is a guard rather than a
  // narrowing somebody could delete as redundant.
  db.prepare("UPDATE tickets SET resolved_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(open.id);

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  assert.equal((await (await sweep()).json()).closed, 0);
  assert.equal(row(open.id).status, 'open');
});

test('many due at once close together, each on its own', async () => {
  const now = movable();
  const { resolve, sweep, row } = await start(now);
  const three = [await resolve(), await resolve(), await resolve()];

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  assert.equal((await (await sweep()).json()).closed, 3);

  for (const ticket of three) assert.equal(row(ticket.id).status, 'closed');
});

test('the sweep is an admin’s to run', async () => {
  const now = movable();
  const { resolve, sweep, agent, row } = await start(now);
  const resolved = await resolve();
  now.advanceDays(REOPEN_WINDOW_DAYS + 1);

  const refused = await sweep(agent);

  // Something has to authenticate, and an operator or a cron acting for the
  // desk is the closest thing this product has to an operator.
  assert.equal(refused.status, 403);
  assert.equal(row(resolved.id).status, 'resolved');
});

test('a ticket that nobody ever reads still closes', async () => {
  const now = movable();
  const { db, resolve, sweep, row } = await start(now);
  const resolved = await resolve();
  const reads = db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  await sweep();

  // The reason evaluating-on-read was refused. A ticket resolved and then
  // forgotten is exactly the ticket T-6 exists for, and a rule that only fires
  // when somebody looks would never close it.
  assert.equal(row(resolved.id).status, 'closed');
  void reads;
});
