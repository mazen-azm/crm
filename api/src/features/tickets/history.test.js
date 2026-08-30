// Proves scripts/criteria/tickets.md section TICKETS-7-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'history-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const token = (await (await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })).json()).token;

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
  const staffId = db.prepare("SELECT id FROM users WHERE role = 'agent' AND deleted_at IS NULL LIMIT 1").get().id;

  const raise = async () =>
    (await (await call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'A ticket with a past', body: 'Body.' },
    })).json());

  const history = (id, query = '') => call(`/api/v1/tickets/${id}/history${query}`);

  return { db, call, raise, history, staffId, adminEmail };
}

test('the whole trail comes back, oldest first', async () => {
  const { call, raise, history, staffId } = await start();
  let ticket = await raise();
  ticket = await (await call(`/api/v1/tickets/${ticket.id}/assignee`, {
    method: 'PATCH', body: { assigneeId: staffId, revision: ticket.revision },
  })).json();
  await call(`/api/v1/tickets/${ticket.id}/status`, {
    method: 'PATCH', body: { status: 'open', revision: ticket.revision },
  });

  const res = await history(ticket.id);
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.deepEqual(Object.keys(body).sort(), ['items', 'limit', 'offset', 'total']);
  assert.equal(body.total, 3);
  assert.deepEqual(body.items.map((e) => e.verb), ['ticket.create', 'ticket.assign', 'ticket.status']);
});

test('an entry says who, and from what to what', async () => {
  const { call, raise, history, staffId } = await start();
  const ticket = await raise();
  await call(`/api/v1/tickets/${ticket.id}/assignee`, {
    method: 'PATCH', body: { assigneeId: staffId, revision: ticket.revision },
  });

  const entry = (await (await history(ticket.id)).json()).items.find((e) => e.verb === 'ticket.assign');
  // An entry recording only the new value cannot answer "who took it off me".
  assert.equal(entry.before.assigneeId, null);
  assert.equal(entry.after.assigneeId, staffId);
  assert.ok(entry.actorId, 'an entry with no actor cannot be followed up');
  assert.ok(entry.at.endsWith('Z'));
});

test('the stored JSON shape does not leak', async () => {
  const { raise, history } = await start();
  const ticket = await raise();
  const [entry] = (await (await history(ticket.id)).json()).items;
  // `diff` is how the row is stored — one JSON column, because SQLite has no
  // JSONB. A client parsing that would make our storage format the contract.
  assert.equal(Object.hasOwn(entry, 'diff'), false);
  assert.deepEqual(Object.keys(entry).sort(), ['actorId', 'after', 'at', 'before', 'id', 'verb']);
});

test('two changes in the same second keep their order', async () => {
  const { db, raise, history } = await start();
  const ticket = await raise();

  // The clock is whole seconds, so this is not contrived: two moves inside one
  // second carry an identical `at` and ORDER BY at alone leaves them to
  // SQLite. Written directly because driving the API cannot force a collision
  // reliably.
  const at = '2026-08-01T00:00:00.000Z';
  for (const verb of ['ticket.first', 'ticket.second', 'ticket.third']) {
    db.prepare(`
      INSERT INTO audit_events (id, actor_id, entity, entity_id, verb, at, diff)
      VALUES (?, NULL, 'ticket', ?, ?, ?, '{"before":null,"after":null}')
    `).run(`${verb}-id`, ticket.id, verb, at);
  }

  const items = (await (await history(ticket.id)).json()).items;
  const sameSecond = items.filter((e) => e.at === at).map((e) => e.verb);
  assert.deepEqual(sameSecond, ['ticket.first', 'ticket.second', 'ticket.third']);
});

test('the history is paged with the ceiling every list obeys', async () => {
  const { call, raise, history, staffId } = await start();
  let ticket = await raise();
  ticket = await (await call(`/api/v1/tickets/${ticket.id}/assignee`, {
    method: 'PATCH', body: { assigneeId: staffId, revision: ticket.revision },
  })).json();
  await call(`/api/v1/tickets/${ticket.id}/status`, {
    method: 'PATCH', body: { status: 'open', revision: ticket.revision },
  });

  const first = await (await history(ticket.id, '?limit=2')).json();
  assert.equal(first.items.length, 2);
  assert.equal(first.total, 3, 'total counts the trail, not the page');

  const second = await (await history(ticket.id, '?limit=2&offset=2')).json();
  assert.equal(second.items.length, 1);
  assert.notEqual(second.items[0].id, first.items[0].id);

  const tooMany = await history(ticket.id, '?limit=10000');
  assert.equal(tooMany.status, 422);
  assert.deepEqual((await tooMany.json()).fields, ['limit']);
});

test('a ticket that is not there is 404, not an empty history', async () => {
  const { history } = await start();
  const res = await history('00000000-0000-4000-8000-000000000000');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, 'NOT_FOUND');
});

test('reading a history writes no audit row', async () => {
  const { db, raise, history } = await start();
  const ticket = await raise();
  const before = db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  await history(ticket.id);
  await history(ticket.id, '?limit=1');

  // Reading a trail is not an event on it.
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, before);
});

test('the query uses the existing index rather than sorting', async () => {
  const { db, raise } = await start();
  const ticket = await raise();
  const plan = db.prepare(`
    EXPLAIN QUERY PLAN
    SELECT id, actor_id, verb, at, diff
      FROM audit_events
     WHERE entity = ? AND entity_id = ?
     ORDER BY at ASC, rowid ASC
     LIMIT ? OFFSET ?
  `).all('ticket', ticket.id, 10, 0).map((r) => r.detail).join(' | ');

  // The index is (entity, entity_id, at DESC) and SQLite walks a b-tree
  // backwards at no cost. The plan said not to add an ASC sibling unless this
  // showed otherwise — so this is the check that made that a decision rather
  // than a hope.
  assert.match(plan, /USING INDEX audit_events_entity_at_idx/);
  assert.doesNotMatch(plan, /TEMP B-TREE FOR ORDER BY/);
});

test('signing in is required', async () => {
  const { raise, history } = await start();
  const ticket = await raise();
  const res = await history(ticket.id, '');
  assert.equal(res.status, 200);
  assert.equal((await (await fetch(res.url, {})).status), 401);
});
