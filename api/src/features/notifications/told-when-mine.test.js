// Proves scripts/criteria/notifications.md section NOTIFICATIONS-1-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { MAX_LIMIT } from '../../platform/http/pagination.js';

const SECRET = 'told-when-mine-secret';
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
  const adminId = (await (await admin('/api/v1/me')).json()).id;

  const makeAgent = async (email) => {
    const made = await (await admin('/api/v1/accounts', {
      method: 'POST',
      body: { email, name: 'An Agent', role: 'agent' },
    })).json();
    return {
      user: made.user,
      call: as((await (await signIn(made.user.email, made.initialPassword)).json()).token),
    };
  };

  const customer = await (await admin('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Aiko Tanaka', email: 'aiko@example.com' },
  })).json();
  const customerSignIn = await (await admin(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();
  const theirs = as((await (await signIn(customer.email, customerSignIn.initialPassword)).json()).token);

  const raise = async () =>
    (await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId: customer.id, subject: 'Something is wrong', body: 'Body.' },
    })).json());

  const assign = (call) => (ticket, assigneeId) =>
    call(`/api/v1/tickets/${ticket.id}/assignee`, {
      method: 'PATCH',
      body: { assigneeId, revision: ticket.revision },
    });

  const rows = (userId) =>
    db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY rowid').all(userId);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, admin, adminId, theirs, makeAgent, raise, assign, rows, audit };
}

test('a ticket becoming yours writes an unread notification naming the ticket', async () => {
  const { admin, makeAgent, raise, assign, rows } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise();

  await assign(admin)(ticket, agent.user.id);

  const [written] = rows(agent.user.id);
  assert.ok(written, 'the agent was told');
  assert.equal(written.ticket_id, ticket.id);
  assert.equal(written.kind, 'ticket.assigned');
  assert.equal(written.read_at, null);
  // The ticket's id, not a copy of its subject: a subject copied here is a
  // subject that goes stale the first time somebody edits it.
  assert.ok(!Object.values(written).includes('Something is wrong'));
});

test('assigning a ticket to yourself tells you nothing', async () => {
  const { admin, adminId, raise, assign, rows } = await start();
  const ticket = await raise();

  await assign(admin)(ticket, adminId);

  // Telling somebody what they just did is noise, and noise is what makes a
  // notification list stop being read.
  assert.deepEqual(rows(adminId), []);
});

test('losing a ticket tells you nothing — the story is “becomes mine”', async () => {
  const { admin, makeAgent, raise, assign, rows } = await start();
  const first = await makeAgent('first@support-desk.local');
  const second = await makeAgent('second@support-desk.local');
  const ticket = await raise();
  const assigned = await (await assign(admin)(ticket, first.user.id)).json();

  await assign(admin)(assigned, second.user.id);

  // The one who gained it is told; the one who lost it is not. No story says
  // otherwise, and this is where that is written down rather than left to be
  // wondered about.
  assert.equal(rows(second.user.id).length, 1);
  assert.equal(rows(first.user.id).length, 1, 'still only the one they gained');
});

test('unassigning tells nobody, including when an account is disabled', async () => {
  const { admin, makeAgent, raise, assign, rows } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise();
  const assigned = await (await assign(admin)(ticket, agent.user.id)).json();
  const before = rows(agent.user.id).length;

  await assign(admin)(assigned, null);
  await admin(`/api/v1/accounts/${agent.user.id}/disable`, { method: 'POST' });

  // Nobody becomes an owner, so there is nobody to tell. IDENTITY-9-API's
  // sweep hands a queue back to nobody and is silent for the same reason.
  assert.equal(rows(agent.user.id).length, before);
});

test('the assignment and the notification are one transaction', async () => {
  const { admin, makeAgent, raise, assign, rows, db } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise();

  await assign(admin)(ticket, agent.user.id);

  // An assignment nobody is told about is the gap this story closes, and a
  // notification for an assignment that did not happen is worse than either.
  assert.equal(db.prepare('SELECT assignee_id FROM tickets WHERE id = ?').get(ticket.id).assignee_id, agent.user.id);
  assert.equal(rows(agent.user.id).length, 1);
});

test('an agent reads their own, oldest first, in the API’s window', async () => {
  const { admin, makeAgent, raise, assign } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  for (let i = 0; i < 3; i += 1) await assign(admin)(await raise(), agent.user.id);

  const page = await (await agent.call('/api/v1/me/notifications')).json();

  // `unread` joined them with NOTIFICATIONS-2-API: a screen showing a badge
  // should not have to ask twice, and a count taken from the page in hand is
  // wrong on every page but the first.
  assert.deepEqual(Object.keys(page).sort(), ['items', 'limit', 'offset', 'total', 'unread']);
  assert.equal(page.total, 3);
  const stamps = page.items.map((n) => n.createdAt);
  assert.deepEqual(stamps, [...stamps].sort());
  assert.deepEqual(Object.keys(page.items[0]).sort(), ['createdAt', 'id', 'kind', 'readAt', 'ticketId']);
  // BR-4 refuses rather than clamps, the same as every other list here.
  assert.equal((await agent.call(`/api/v1/me/notifications?limit=${MAX_LIMIT + 1}`)).status, 422);
});

test('somebody else’s notifications are not reachable by any request they can make', async () => {
  const { admin, makeAgent, raise, assign } = await start();
  const mine = await makeAgent('mine@support-desk.local');
  const other = await makeAgent('other@support-desk.local');
  await assign(admin)(await raise(), other.user.id);

  const page = await (await mine.call('/api/v1/me/notifications')).json();
  // The ITEMS as well as the total. A mutation that widened the query while
  // leaving the count alone passed a test that checked only the number — the
  // leak would have been in the rows, which is the half that reaches a
  // reader.
  assert.deepEqual(page.items, []);
  assert.equal(page.total, 0);

  // And not by id either: scoped to the reader, so somebody else's is not
  // found rather than found-and-refused — one answer, so nothing about it says
  // whether the id exists.
  const theirs = await (await other.call('/api/v1/me/notifications')).json();
  const res = await mine.call(`/api/v1/me/notifications/${theirs.items[0].id}/read`, { method: 'POST' });
  const missing = await mine.call('/api/v1/me/notifications/no-such-notification/read', { method: 'POST' });
  assert.equal(res.status, 404);
  assert.equal(missing.status, 404);
  const [a, b] = [await res.json(), await missing.json()];
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('reading the list does not mark anything read', async () => {
  const { admin, makeAgent, raise, assign, rows } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  await assign(admin)(await raise(), agent.user.id);

  await agent.call('/api/v1/me/notifications');
  await agent.call('/api/v1/me/notifications');

  // An agent who glances at the screen has not dismissed everything on it.
  assert.equal(rows(agent.user.id)[0].read_at, null);
});

test('marking one read is a write, and marking it twice is not two events', async () => {
  const { admin, makeAgent, raise, assign, rows, audit } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  await assign(admin)(await raise(), agent.user.id);
  const [held] = (await (await agent.call('/api/v1/me/notifications')).json()).items;
  const before = audit().length;

  const first = await agent.call(`/api/v1/me/notifications/${held.id}/read`, { method: 'POST' });
  assert.equal(first.status, 200);
  const marked = await first.json();
  assert.ok(marked.readAt);
  assert.equal(audit().length, before + 1);
  assert.equal(audit().at(-1).verb, 'notification.read');

  const again = await agent.call(`/api/v1/me/notifications/${held.id}/read`, { method: 'POST' });
  assert.equal(again.status, 200);
  // No second row, and the moment it was first read does not move.
  assert.equal(audit().length, before + 1);
  assert.equal((await again.json()).readAt, marked.readAt);
  assert.equal(rows(agent.user.id)[0].read_at, marked.readAt);
});

test('writing a notification is audited', async () => {
  const { admin, adminId, makeAgent, raise, assign, audit } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  const ticket = await raise();
  const before = audit().length;

  await assign(admin)(ticket, agent.user.id);

  const written = audit().slice(before).filter((r) => r.verb === 'notification.create');
  assert.equal(written.length, 1);
  // The actor is who caused it, which is the person who assigned the ticket.
  assert.equal(written[0].actor_id, adminId);
  const diff = JSON.parse(written[0].diff);
  assert.equal(diff.after.userId, agent.user.id);
  assert.equal(diff.after.ticketId, ticket.id);
});

test('a customer has none and is refused rather than shown an empty list', async () => {
  const { theirs } = await start();

  // Nothing writes a notification for a customer, so there is nothing here for
  // one to read. A guard says that; an empty list looks like a bug.
  assert.equal((await theirs('/api/v1/me/notifications')).status, 403);
  assert.equal((await theirs('/api/v1/me/notifications/any/read', { method: 'POST' })).status, 403);
});

test('the list can be narrowed to the unread ones', async () => {
  const { admin, makeAgent, raise, assign } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  for (let i = 0; i < 3; i += 1) await assign(admin)(await raise(), agent.user.id);

  const all = await (await agent.call('/api/v1/me/notifications')).json();
  await agent.call(`/api/v1/me/notifications/${all.items[0].id}/read`, { method: 'POST' });

  const unread = await (await agent.call('/api/v1/me/notifications?filter=unread')).json();

  // A person with four hundred read notifications and two new ones cannot
  // find the two by paging — and a screen fetching every page to filter them
  // itself is the client inventing a query the server can answer.
  assert.equal(unread.items.length, 2);
  assert.ok(unread.items.every((n) => n.readAt === null));
  // `total` is what matches the query, so here it IS the unread count.
  assert.equal(unread.total, 2);
  // And the unread view keeps the order the whole list has.
  const stamps = unread.items.map((n) => n.createdAt);
  assert.deepEqual(stamps, [...stamps].sort());
});

test('the unread count comes back whatever was asked for, and is about the person', async () => {
  const { admin, makeAgent, raise, assign } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  for (let i = 0; i < 3; i += 1) await assign(admin)(await raise(), agent.user.id);

  // A window of one over three unread.
  const page = await (await agent.call('/api/v1/me/notifications?limit=1')).json();

  assert.equal(page.items.length, 1);
  assert.equal(page.total, 3);
  // Not one. A badge derived from the page in hand would say 1 here and would
  // change when somebody turned the page without reading anything.
  assert.equal(page.unread, 3);

  await agent.call(`/api/v1/me/notifications/${page.items[0].id}/read`, { method: 'POST' });
  assert.equal((await (await agent.call('/api/v1/me/notifications?limit=1')).json()).unread, 2);
});

test('the count is somebody’s own, not everybody’s', async () => {
  const { admin, makeAgent, raise, assign } = await start();
  const mine = await makeAgent('mine@support-desk.local');
  const other = await makeAgent('other@support-desk.local');
  await assign(admin)(await raise(), other.user.id);
  await assign(admin)(await raise(), other.user.id);

  const page = await (await mine.call('/api/v1/me/notifications')).json();

  assert.equal(page.unread, 0);
  assert.equal(page.total, 0);
});

test('a filter nobody offered is refused, naming the field', async () => {
  const { admin, makeAgent, raise, assign } = await start();
  const agent = await makeAgent('an-agent@support-desk.local');
  await assign(admin)(await raise(), agent.user.id);

  for (const value of ['read', 'new', 'UNREAD', '']) {
    const res = await agent.call(`/api/v1/me/notifications?filter=${value}`);
    assert.equal(res.status, 422, value);
    assert.deepEqual((await res.json()).fields, ['filter'], value);
  }

  // `all` is a value, not an absence, and both mean the same thing.
  const spelled = await (await agent.call('/api/v1/me/notifications?filter=all')).json();
  const implied = await (await agent.call('/api/v1/me/notifications')).json();
  assert.deepEqual(spelled, implied);
});
