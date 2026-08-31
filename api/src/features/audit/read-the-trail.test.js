// Proves scripts/criteria/audit.md section AUDIT-2-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { MAX_LIMIT } from '../../platform/http/pagination.js';

const SECRET = 'read-the-trail-secret';
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

  const admin = (path, init) =>
    signIn(adminEmail, adminPassword).then((r) => r.json()).then(({ token }) => as(token)(path, init));
  const adminId = (await (await admin('/api/v1/me')).json()).id;

  const madeAgent = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'an-agent@support-desk.local', name: 'An Agent', role: 'agent' },
  })).json();
  const agent = (path, init) =>
    signIn(madeAgent.user.email, madeAgent.initialPassword)
      .then((r) => r.json()).then(({ token }) => as(token)(path, init));

  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async (call = admin) =>
    (await (await call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.' },
    })).json());
  const resolve = async (ticket) =>
    (await (await admin(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status: 'resolved', revision: ticket.revision, note: 'We fixed it.' },
    })).json());

  const trail = (query = '', call = admin) => call(`/api/v1/audit-events${query}`);
  return { db, now, admin, agent, adminId, agentId: madeAgent.user.id, raise, resolve, trail };
}

test('an admin reads the whole trail, oldest first, in the API’s window', async () => {
  const { trail } = await start();

  const page = await (await trail()).json();

  assert.deepEqual(Object.keys(page).sort(), ['items', 'limit', 'offset', 'total']);
  assert.ok(page.total > 0, 'seeding and setup wrote rows');
  const stamps = page.items.map((r) => r.at);
  assert.deepEqual(stamps, [...stamps].sort());
  assert.deepEqual(
    Object.keys(page.items[0]).sort(),
    ['actorId', 'after', 'at', 'before', 'entity', 'entityId', 'id', 'verb'],
  );
  // BR-4 refuses rather than clamps, the same as every other list here.
  assert.equal((await trail(`?limit=${MAX_LIMIT + 1}`)).status, 422);
});

test('by person', async () => {
  const { trail, raise, agent, adminId, agentId } = await start();
  await raise();
  await raise(agent);

  const theirs = await (await trail(`?actorId=${agentId}`)).json();
  const mine = await (await trail(`?actorId=${adminId}`)).json();

  assert.ok(theirs.total > 0);
  assert.ok(theirs.items.every((r) => r.actorId === agentId));
  assert.ok(mine.items.every((r) => r.actorId === adminId));
});

test('the total is what matches, not what the page holds', async () => {
  const { trail, adminId, raise } = await start();
  await raise();
  await raise();

  const narrow = await (await trail(`?actorId=${adminId}&limit=1`)).json();

  // A window of one over a filter that matches many. Counting the page would
  // give 1 and would be wrong on every page but the last — and a screen
  // showing "1 event" while paging through twenty is a screen reporting its
  // own window back to the reader.
  assert.equal(narrow.items.length, 1);
  assert.ok(narrow.total > 1, `expected more than one match, got ${narrow.total}`);
  assert.equal(narrow.limit, 1);
});

test('by the system, which is the one nobody else can explain', async () => {
  const now = movable();
  const { trail, raise, resolve, admin } = await start(now);
  const resolved = await resolve(await raise());
  now.advanceDays(20);
  await admin('/api/v1/tickets/sweep-auto-close', { method: 'POST' });

  const page = await (await trail('?actorId=system')).json();

  // The auto-close, attributed to nobody. A filter that could not express
  // "the system" would hide exactly the rows an admin cannot ask a person
  // about — and `actor_id IS NULL` is not something a value comparison
  // reaches.
  assert.equal(page.total, 1);
  assert.equal(page.items[0].actorId, null);
  assert.equal(page.items[0].entityId, resolved.id);
  assert.equal(JSON.parse(JSON.stringify(page.items[0].after)).status, 'closed');
});

test('by thing', async () => {
  const { trail, raise } = await start();
  const first = await raise();
  await raise();

  const page = await (await trail(`?entity=ticket&entityId=${first.id}`)).json();

  assert.ok(page.total > 0);
  assert.ok(page.items.every((r) => r.entity === 'ticket' && r.entityId === first.id));
});

test('an id with no thing beside it is refused', async () => {
  const { trail, raise } = await start();
  const ticket = await raise();

  const res = await trail(`?entityId=${ticket.id}`);

  // The id column is not unique on its own, and which entity is half of what
  // identifies a row here. Answering with everything that happens to share an
  // id would be answering a different question.
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['entity']);
});

test('by date, inclusive at both ends', async () => {
  const now = movable();
  const { trail, raise } = await start(now);
  const early = new Date(now() * 1000).toISOString();
  await raise();

  now.advanceDays(3);
  const later = new Date(now() * 1000).toISOString();
  await raise();

  const upToTheFirst = await (await trail(`?to=${encodeURIComponent(early)}`)).json();
  const fromTheSecond = await (await trail(`?from=${encodeURIComponent(later)}`)).json();

  // Inclusive: the stamps are whole seconds, so an exclusive bound would drop
  // everything that happened in the last second of the range somebody asked
  // for — which on this clock can be a whole request.
  assert.ok(upToTheFirst.items.every((r) => r.at <= early));
  assert.ok(upToTheFirst.items.some((r) => r.at === early), 'the boundary second is included');
  assert.ok(fromTheSecond.items.every((r) => r.at >= later));
  assert.ok(fromTheSecond.items.some((r) => r.at === later), 'and at the other end too');
});

test('the filters combine', async () => {
  const now = movable();
  const { trail, raise, agent, agentId } = await start(now);
  const theirs = await raise(agent);
  now.advanceDays(1);
  await raise(agent);

  const from = new Date((now() - DAY) * 1000).toISOString();
  const page = await (await trail(
    `?actorId=${agentId}&entity=ticket&entityId=${theirs.id}&from=${encodeURIComponent(from)}`,
  )).json();

  assert.ok(page.total > 0);
  assert.ok(page.items.every((r) => r.actorId === agentId && r.entityId === theirs.id));
});

test('a filter that is present and empty is a mistake, not a filter', async () => {
  const { trail } = await start();

  for (const [query, field] of [
    ['?actorId=', 'actorId'],
    ['?entity=', 'entity'],
    ['?entity=ticket&entityId=', 'entityId'],
  ]) {
    const res = await trail(query);
    // A screen that sends `?actorId=` has lost its value somewhere. Answering
    // with the whole trail hides that from whoever is looking at it.
    assert.equal(res.status, 422, query);
    assert.deepEqual((await res.json()).fields, [field], query);
  }
});

test('a date that is not one, and a range that cannot contain anything', async () => {
  const { trail } = await start();

  for (const [query, fields] of [
    ['?from=yesterday', ['from']],
    ['?to=2026-13-45', ['to']],
    ['?from=2026-09-01T00:00:00.000Z&to=2026-08-01T00:00:00.000Z', ['from']],
  ]) {
    const res = await trail(query);
    assert.equal(res.status, 422, query);
    assert.deepEqual((await res.json()).fields, fields, query);
  }
});

test('two rows written in the same second keep their order between reads', async () => {
  const { trail, raise } = await start();
  // The clock is fixed, so everything setup wrote shares a second.
  const once = await (await trail('?limit=100')).json();
  await raise();
  const twice = await (await trail('?limit=100')).json();

  // A second-resolution stamp is not an order (L-19). The tiebreak is the
  // rowid, and without it these two reads could disagree about what happened
  // first.
  assert.deepEqual(
    once.items.map((r) => r.id),
    twice.items.slice(0, once.items.length).map((r) => r.id),
  );
});

test('an agent is refused, and no row travels', async () => {
  const { trail, agent } = await start();

  const res = await trail('', agent);

  assert.equal(res.status, 403);
  const body = await res.text();
  assert.ok(!body.includes('verb'), 'nothing of the trail came back');
});

test('reading the trail writes nothing to it', async () => {
  const { db, trail } = await start();
  const before = db.prepare('SELECT count(*) AS n FROM audit_events').get().n;

  await trail();
  await trail('?actorId=system');

  // A read that recorded itself would grow the thing it reads, and every read
  // would change the answer to the next one.
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, before);
});
