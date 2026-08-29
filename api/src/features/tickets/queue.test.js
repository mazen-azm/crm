// Proves scripts/criteria/tickets.md section TICKETS-2-API: the queue is
// shared, filterable, paginated by the ceiling every list obeys, and refuses a
// sort it does not name.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'queue-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  // A frozen clock, so every ticket raised below shares a created_at and the
  // tiebreaker is the only thing deciding their order.
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
  const raise = async (extra = {}) =>
    (await (await call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Subject', body: 'Body', ...extra },
    })).json());
  const queue = (query = '') => call(`/api/v1/tickets${query}`);

  return { db, call, raise, queue, customerId, signInAs, token };
}

const idsIn = async (res) => (await res.json()).items.map((t) => t.id);

test('the queue lists what was raised, newest first', async () => {
  const { raise, queue } = await start();
  const first = await raise({ subject: 'One' });
  const second = await raise({ subject: 'Two' });

  const res = await queue();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['items', 'limit', 'offset', 'total']);
  assert.equal(body.total, 2);
  // Both share a second here, so created_at DESC cannot separate them and the
  // tiebreaker decides: rowid ASC, which is insertion order. That is
  // deliberate and it costs nothing (see the repository's measurement) — the
  // tiebreaker's job is that a ticket cannot move between pages, not that it
  // wins an argument about which of two tickets raised in the same second is
  // newer. The cross-second ordering is asserted separately below.
  assert.deepEqual(body.items.map((t) => t.subject), ['One', 'Two']);
  assert.ok(body.items.every((t) => t.revision === 1), 'the token a later write sends back');
  void first; void second;
});

test('across seconds, the queue really is newest first', async () => {
  // The tiebreaker only speaks when created_at cannot. This is the ordering
  // the criterion is actually about, and it needs two different seconds to be
  // visible at all.
  const { db, raise, queue } = await start();
  const older = await raise({ subject: 'older' });
  await raise({ subject: 'newer' });
  db.prepare('UPDATE tickets SET created_at = ? WHERE id = ?')
    .run('2020-01-01T00:00:00.000Z', older.id);

  assert.deepEqual((await (await queue()).json()).items.map((t) => t.subject), ['newer', 'older']);
});

test('the same order comes back on a second request', async () => {
  const { raise, queue } = await start();
  for (const subject of ['a', 'b', 'c', 'd']) await raise({ subject });

  // Every one shares a created_at, so only the tiebreaker separates them.
  //
  // Read this for what it is: deleting the tiebreaker from the query does NOT
  // make this test fail. That was tried. SQLite returns equal keys in rowid
  // order of its own accord, on both of the query plans this endpoint uses, so
  // the clause is currently unobservable. It stays because the engine does not
  // promise that, and this test stays because it pins the behaviour we depend
  // on — not because it proves the clause is doing the work.
  assert.deepEqual(await idsIn(await queue()), await idsIn(await queue()));
});

test('paging does not lose or repeat a ticket', async () => {
  const { raise, queue } = await start();
  for (const subject of ['a', 'b', 'c', 'd', 'e']) await raise({ subject });

  const all = await idsIn(await queue('?limit=50'));
  const first = await idsIn(await queue('?limit=2&offset=0'));
  const second = await idsIn(await queue('?limit=2&offset=2'));
  const third = await idsIn(await queue('?limit=2&offset=4'));

  assert.deepEqual([...first, ...second, ...third], all);
  assert.equal(new Set(all).size, 5, 'no ticket appears twice');
});

test('filters narrow the queue, and combine', async () => {
  const { raise, queue } = await start();
  await raise({ subject: 'urgent one', priority: 'urgent' });
  await raise({ subject: 'low one', priority: 'low' });
  await raise({ subject: 'another urgent', priority: 'urgent' });

  const urgent = await (await queue('?priority=urgent')).json();
  assert.equal(urgent.total, 2);

  // Every ticket is raised `new`, so combining narrows to the same two.
  const both = await (await queue('?priority=urgent&status=new')).json();
  assert.equal(both.total, 2);
  const none = await (await queue('?priority=urgent&status=resolved')).json();
  assert.equal(none.total, 0);
  assert.deepEqual(none.items, []);
});

test('assigneeId=none is the unassigned filter', async () => {
  const { db, raise, queue } = await start();
  const assigned = await raise({ subject: 'has an owner' });
  await raise({ subject: 'nobody yet' });
  // Assigning is TICKETS-3-API; this reaches past it to make the filter real.
  const staffId = db.prepare('SELECT id FROM users LIMIT 1').get().id;
  db.prepare('UPDATE tickets SET assignee_id = ? WHERE id = ?').run(staffId, assigned.id);

  const unassigned = await (await queue('?assigneeId=none')).json();
  assert.equal(unassigned.total, 1);
  assert.equal(unassigned.items[0].subject, 'nobody yet');

  const theirs = await (await queue(`?assigneeId=${staffId}`)).json();
  assert.equal(theirs.total, 1);
  assert.equal(theirs.items[0].subject, 'has an owner');
});

test('a filter the API does not name is refused, not ignored', async () => {
  const { raise, queue } = await start();
  await raise();

  for (const [query, field] of [
    ['?status=archived', 'status'],
    ['?priority=medium', 'priority'],
    ['?sort=subject', 'sort'],
    ['?assigneeId=', 'assigneeId'],
  ]) {
    const res = await queue(query);
    assert.equal(res.status, 422, `${query} should be refused`);
    const answer = await res.json();
    assert.deepEqual(answer.fields, [field]);
    // The parameter name travels; the value never does.
    assert.ok(!JSON.stringify(answer).includes('archived'));
    assert.ok(!JSON.stringify(answer).includes('medium'));
  }
});

test('the page ceiling refuses, it does not clamp (BR-4)', async () => {
  const { queue } = await start();
  const res = await queue('?limit=500');
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['limit']);
});

test('a soft-deleted ticket is never in the queue', async () => {
  const { db, raise, queue } = await start();
  const gone = await raise({ subject: 'removed' });
  await raise({ subject: 'still here' });
  db.prepare('UPDATE tickets SET deleted_at = ? WHERE id = ?').run('2026-08-29', gone.id);

  const body = await (await queue()).json();
  assert.equal(body.total, 1);
  assert.deepEqual(body.items.map((t) => t.subject), ['still here']);
});

test('an agent sees the whole queue, not only their own tickets', async () => {
  const { call, raise, signInAs, token } = await start();
  await raise({ subject: 'raised by the admin' });

  const { initialPassword } = await (await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'looker@support-desk.local', name: 'Looker', role: 'agent' },
    tok: token,
  })).json();
  const agent = await signInAs('looker@support-desk.local', initialPassword);

  // SC-1: one organisation, one queue. Somebody else's ticket is still theirs
  // to see — an agent who cannot see the queue cannot work it.
  const body = await (await call('/api/v1/tickets', { tok: agent })).json();
  assert.equal(body.total, 1);
  assert.equal(body.items[0].subject, 'raised by the admin');
});

test('reading the queue writes no audit row', async () => {
  const { db, raise, queue } = await start();
  await raise();
  const before = db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  await queue();
  await queue('?priority=urgent');
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, before);
});

test('no token is 401', async () => {
  const { call } = await start();
  assert.equal((await call('/api/v1/tickets', { tok: null })).status, 401);
});

test('total counts the matches, not the page', async () => {
  const { raise, queue } = await start();
  for (let i = 0; i < 5; i += 1) await raise({ subject: `t${i}`, priority: 'high' });
  await raise({ subject: 'other', priority: 'low' });

  const body = await (await queue('?priority=high&limit=2')).json();
  assert.equal(body.items.length, 2);
  assert.equal(body.total, 5);
});
