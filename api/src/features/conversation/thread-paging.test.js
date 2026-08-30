// Proves scripts/criteria/conversation.md section CONVERSATION-4-API.
//
// The thread route was built by CONVERSATION-1-API and made kind-aware by
// CONVERSATION-2-API, and both took their paging from the shared helper rather
// than writing one. So this story adds no behaviour: it adds the test that says
// the behaviour is a promise rather than an accident of which helper somebody
// reached for. A route that pages correctly and has no test saying so is one
// refactor away from paging differently.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { MAX_LIMIT } from '../../platform/http/pagination.js';

const SECRET = 'thread-paging-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start({ messages = 5 } = {}) {
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

  const staff = as((await (await signIn(adminEmail, adminPassword)).json()).token);

  const customer = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Aiko Tanaka', email: 'aiko@example.com' },
  })).json();
  const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();
  const theirs = as((await (await signIn(customer.email, granted.initialPassword)).json()).token);

  const ticket = await (await staff('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'Something is wrong', body: 'Body.' },
  })).json();

  // Written straight into the table so a long thread costs one statement per
  // message rather than a round trip, and so the timestamps can be chosen: the
  // order and the same-second tie are what this file is about.
  const authorId = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get().id;
  const write = db.prepare(`
    INSERT INTO ticket_messages (id, ticket_id, author_id, kind, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const written = [];
  for (let i = 0; i < messages; i += 1) {
    const id = `m-${String(i).padStart(3, '0')}`;
    // Every second message is a note, so the reader's total and the reader's
    // page are both about a filtered set rather than the whole table.
    const kind = i % 2 === 1 ? 'internal' : 'public';
    const at = `2026-08-30T10:${String(i).padStart(2, '0')}:00.000Z`;
    write.run(id, ticket.id, authorId, kind, `Message ${i}`, at);
    written.push({ id, kind, at });
  }

  const read = (call) => (query = '') => call(`/api/v1/tickets/${ticket.id}/messages${query}`);
  return { db, staff, theirs, ticket, written, read };
}

test('a page says what it gave and from where, and stops at the default', async () => {
  const { read, staff } = await start({ messages: 25 });

  const page = await (await read(staff)()).json();

  // The four numbers every list here answers with. A caller that has to work
  // out where it is from the length of what it got cannot tell a short page
  // from the last one.
  assert.deepEqual(Object.keys(page).sort(), ['items', 'limit', 'offset', 'total']);
  assert.equal(page.limit, 20);
  assert.equal(page.offset, 0);
  assert.equal(page.total, 25);
  assert.equal(page.items.length, 20);
});

test('the ceiling is the one every list obeys, not one of its own', async () => {
  const { read, staff } = await start({ messages: 3 });

  // The shared constant, not a number typed here: a second number would be a
  // second answer to how big a page may be, and this test would be where the
  // two started to disagree.
  assert.equal((await read(staff)(`?limit=${MAX_LIMIT}`)).status, 200);
  assert.equal((await read(staff)(`?limit=${MAX_LIMIT + 1}`)).status, 422);
});

test('a window the rules refuse is refused rather than clamped, and the field is named', async () => {
  const { read, staff } = await start({ messages: 3 });

  for (const [query, field] of [
    ['?limit=0', 'limit'],
    ['?limit=-1', 'limit'],
    ['?limit=abc', 'limit'],
    ['?limit=500', 'limit'],
    ['?offset=-1', 'offset'],
    ['?offset=abc', 'offset'],
  ]) {
    const res = await read(staff)(query);
    assert.equal(res.status, 422, query);
    const body = await res.json();
    // Named, so a caller knows which parameter to fix. Clamping would answer
    // 200 with a page nobody asked for, and the caller's bug would ship.
    assert.deepEqual(body.fields, [field], query);
    // And never the value that was sent: a 422 carries field names only.
    assert.ok(!JSON.stringify(body).includes('500'), query);
  }
});

test('the pages cover the thread exactly once, in one order', async () => {
  const { read, staff } = await start({ messages: 25 });

  const seen = [];
  for (let offset = 0; offset < 25; offset += 10) {
    const page = await (await read(staff)(`?limit=10&offset=${offset}`)).json();
    seen.push(...page.items.map((m) => m.id));
  }

  // Every message once — no gap and no repeat across the window boundaries,
  // which is what an unstable sort produces and what a reader would see as a
  // message that vanished when they turned the page.
  assert.equal(new Set(seen).size, 25);
  assert.deepEqual(seen, [...seen].sort());
});

test('the order is oldest first, and stable when a second holds several', async () => {
  const { db, read, staff, ticket } = await start({ messages: 3 });
  const at = '2026-08-30T09:00:00.000Z';
  // Three messages sharing one second, written BEFORE the others: the clock is
  // whole seconds, so this is not a contrived case — it is what two quick
  // replies look like.
  for (const id of ['same-c', 'same-a', 'same-b']) {
    db.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, author_id, kind, body, created_at)
      VALUES (?, ?, (SELECT id FROM users LIMIT 1), 'public', ?, ?)
    `).run(id, ticket.id, `Body ${id}`, at);
  }

  const once = await (await read(staff)()).json();
  const twice = await (await read(staff)('?limit=100')).json();

  // Oldest first...
  const stamps = once.items.map((m) => m.createdAt);
  assert.deepEqual(stamps, [...stamps].sort());
  // ...and the same answer twice, at two different window sizes. A tie broken
  // by nothing is a tie the engine may break differently on a different plan,
  // and a reader would see two messages swap between two loads.
  assert.deepEqual(
    once.items.map((m) => m.id),
    twice.items.slice(0, once.items.length).map((m) => m.id),
  );
  assert.deepEqual(
    once.items.filter((m) => m.createdAt === at).map((m) => m.id),
    ['same-c', 'same-a', 'same-b'],
  );
});

test('the total is the number of messages the reader may see', async () => {
  const { read, staff, theirs } = await start({ messages: 10 });

  const desk = await (await read(staff)()).json();
  const customer = await (await read(theirs)()).json();

  // Ten written, five of them notes.
  assert.equal(desk.total, 10);
  assert.equal(customer.total, 5);
  // A total that counted what they cannot read would tell them how many notes
  // there are — the leak wearing a number, and the same rule
  // CONVERSATION-2-API states about the items, applied to the count.
  assert.ok(customer.items.every((m) => m.kind === 'public'));
});

test('a customer’s last page is their last page, not the desk’s', async () => {
  const { read, theirs } = await start({ messages: 10 });

  const page = await (await read(theirs)('?limit=4&offset=4')).json();

  // Five visible messages, so a window starting at four holds exactly one.
  // Paging applied after the filter rather than before it — the other way
  // round gives a customer empty pages where the notes were, which is the gap
  // CONVERSATION-2-API says must not exist.
  assert.equal(page.total, 5);
  assert.equal(page.items.length, 1);
  assert.equal(page.offset, 4);
});
