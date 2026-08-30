// An internal note never reaches a customer, in ANY response.
//
// The criterion says "in any response", so this drives every route the API
// serves — read off the router, not listed — as the customer who owns the
// ticket the note is on, and asserts the note is nowhere in what comes back.
//
// No heuristic about which routes could carry a message. A census that decided
// for itself which routes were worth checking would be a census with an
// opinion, and the opinion is the thing that goes stale: the next route to
// leak will be one nobody thought could. Driving all of them costs a few
// hundred milliseconds and needs no annotation, no allowlist and nothing to
// keep up to date.
//
// It is the fourth census of this shape, after audit, ownership and staff-only,
// and it exists for the same reason all three do: a rule enforced route by
// route lapses the first time somebody adds a route.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { collectRoutes } from '../../platform/http/route-table.js';
import { API_V1_PREFIX } from '../../platform/http/prefix.js';

const SECRET = 'note-leak-census-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// Distinctive enough that finding it anywhere in a response body is proof,
// and not a substring of anything the API says on its own.
const NOTE_BODY = 'INTERNAL-ONLY-do-not-show-a-customer-7f3a91';
const PUBLIC_BODY = 'We are looking into it now.';

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const app = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 });
  const server = app.listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = (email, password) =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const as = (tok) => (method, path, body) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        'Content-Type': 'application/json',
      },
      ...(method === 'GET' || method === 'HEAD' ? {} : { body: JSON.stringify(body ?? {}) }),
    });

  const staff = as((await (await signIn(adminEmail, adminPassword)).json()).token);

  const customer = await (await staff('POST', '/api/v1/customers', {
    name: 'Aiko Tanaka',
    email: 'aiko@example.com',
  })).json();
  const granted = await (await staff('POST', `/api/v1/customers/${customer.id}/sign-in`)).json();
  const theirs = as((await (await signIn(customer.email, granted.initialPassword)).json()).token);

  const ticket = await (await staff('POST', '/api/v1/tickets', {
    customerId: customer.id,
    subject: 'Something is wrong',
    body: 'Body.',
  })).json();

  // One public reply through the route, and one internal note written straight
  // into the table — the note's own route is CONVERSATION-2-WEB's story and
  // does not exist yet, and the rule about who may READ a note does not wait
  // for the route that writes one.
  await staff('POST', `/api/v1/tickets/${ticket.id}/replies`, { body: PUBLIC_BODY });
  const note = {
    id: 'note-1',
    ticketId: ticket.id,
    authorId: db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get().id,
  };
  db.prepare(`
    INSERT INTO ticket_messages (id, ticket_id, author_id, kind, body, created_at)
    VALUES (?, ?, ?, 'internal', ?, '2026-08-30T10:00:00.000Z')
  `).run(note.id, note.ticketId, note.authorId, NOTE_BODY);

  return { db, app, url, staff, theirs, customer, ticket, note };
}

// Every route, with its parameters filled in by real ids where the census has
// them and a value that exists nowhere otherwise. A 404 or a 403 passes: the
// census is about what a response CARRIES, and a refusal carries nothing.
const concrete = (path, { ticket, note, customer }) =>
  path
    .replace(/:id\b/, ticket.id)
    .replace(/:messageId\b/, note.id)
    .replace(/:channel\b/, 'web')
    .replace(/:[A-Za-z0-9_]+/g, customer.id);

test('no response to a customer carries an internal note, on any route the API serves', async () => {
  const { app, theirs, ticket, note, customer } = await start();
  const served = collectRoutes(app, API_V1_PREFIX);
  assert.ok(served.length > 0, 'the app served no routes — the census is reading nothing');

  const leaked = [];
  for (const entry of served) {
    const [method, path] = entry.split(' ');
    const res = await theirs(method, concrete(path, { ticket, note, customer }));
    const text = await res.text();
    // The body, the id, and the word itself. A note a customer can see the
    // shape of has leaked its existence, so 'internal' is checked too.
    if (text.includes(NOTE_BODY)) leaked.push(`${entry} carried the note's body`);
    if (text.includes(note.id)) leaked.push(`${entry} carried the note's id`);
    if (text.includes('"internal"')) leaked.push(`${entry} named the kind`);
  }

  assert.deepEqual(
    leaked,
    [],
    `an internal note reached a customer:\n  ${leaked.join('\n  ')}\n`
      + 'Filter it in the query, not after the fact — and the count with it.',
  );
});

test('a customer reads the thread and sees the public half, whole', async () => {
  const { theirs, ticket } = await start();

  const res = await theirs('GET', `/api/v1/tickets/${ticket.id}/messages`);
  assert.equal(res.status, 200);
  const page = await res.json();

  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].body, PUBLIC_BODY);
  assert.equal(page.items[0].kind, 'public');
  // The total counts what the reader may see. One that included the note would
  // tell them how many there are, which is the leak wearing a number.
  assert.equal(page.total, 1);
});

test('staff see both kinds, and each row says which it is', async () => {
  const { staff, ticket } = await start();

  const page = await (await staff('GET', `/api/v1/tickets/${ticket.id}/messages`)).json();

  // Both halves are pinned. A filter that also hid notes from agents would
  // make the feature useless to the desk, and only a test on this side sees
  // it.
  assert.equal(page.total, 2);
  assert.deepEqual(page.items.map((m) => m.kind).sort(), ['internal', 'public']);
  assert.ok(page.items.some((m) => m.body === NOTE_BODY));
});

test('somebody else’s thread is the same 404 a missing ticket gets', async () => {
  const { staff, theirs, customer } = await start();
  void customer;
  const other = await (await staff('POST', '/api/v1/customers', {
    name: 'Somebody Else',
    email: 'other@example.com',
  })).json();
  const notTheirs = await (await staff('POST', '/api/v1/tickets', {
    customerId: other.id,
    subject: 'Theirs',
    body: 'Body.',
  })).json();

  const refused = await theirs('GET', `/api/v1/tickets/${notTheirs.id}/messages`);
  const missing = await theirs('GET', '/api/v1/tickets/no-such-ticket/messages');
  assert.equal(refused.status, 404);
  assert.equal(missing.status, 404);
  const [a, b] = [await refused.json(), await missing.json()];
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('the thread is paged by the API’s window, and refuses one it does not allow', async () => {
  const { staff, ticket } = await start();

  const first = await (await staff('GET', `/api/v1/tickets/${ticket.id}/messages?limit=1&offset=0`)).json();
  assert.equal(first.items.length, 1);
  assert.equal(first.total, 2);
  assert.equal(first.limit, 1);

  const second = await (await staff('GET', `/api/v1/tickets/${ticket.id}/messages?limit=1&offset=1`)).json();
  assert.equal(second.items.length, 1);
  assert.notEqual(second.items[0].id, first.items[0].id);

  // BR-4 refuses rather than clamps, the same way every other list here does.
  assert.equal((await staff('GET', `/api/v1/tickets/${ticket.id}/messages?limit=500`)).status, 422);
});

test('the thread is oldest first, and stable when two share a second', async () => {
  const { db, staff, ticket } = await start();
  const at = '2026-08-30T11:00:00.000Z';
  for (const id of ['same-second-a', 'same-second-b']) {
    db.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, author_id, kind, body, created_at)
      VALUES (?, ?, (SELECT id FROM users LIMIT 1), 'public', ?, ?)
    `).run(id, ticket.id, `Body ${id}`, at);
  }

  const once = await (await staff('GET', `/api/v1/tickets/${ticket.id}/messages`)).json();
  const twice = await (await staff('GET', `/api/v1/tickets/${ticket.id}/messages`)).json();

  // Oldest first, and the same-second pair in the order they were written.
  assert.deepEqual(once.items.map((m) => m.id), twice.items.map((m) => m.id));
  const stamps = once.items.map((m) => m.createdAt);
  assert.deepEqual(stamps, [...stamps].sort());
  const sameSecond = once.items.filter((m) => m.createdAt === at).map((m) => m.id);
  assert.deepEqual(sameSecond, ['same-second-a', 'same-second-b']);

  // Honest about what this cannot prove. The clock is whole seconds, so two
  // messages written in the same second share a timestamp — and the ORDER BY
  // carries `rowid ASC` to break the tie. Removing it does not change the
  // answer on this engine: the index is (ticket_id, created_at) and every
  // SQLite index carries the rowid as its payload, so the scan is already in
  // rowid order among equal keys. The migration's own comment says that.
  //
  // The clause stays because the guarantee should be in the query rather than
  // in a property of how the engine stores an index — but a mutation deleting
  // it passes, and pretending otherwise would be worse than saying so.
});
