// Proves the route PORTAL-3-WEB (CRM-123) could not be built without: one
// ticket, for whoever may read it.
//
// It is not a story of its own. Nothing in the 138 units returns a single
// ticket — the desk reads a list and a customer reads a list — so the portal's
// ticket screen had nothing to ask. The fourth time a WEB story has arrived
// with its API half missing (L-56, L-59).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { REOPEN_WINDOW_DAYS } from './tickets.rules.js';

const SECRET = 'read-one-secret';
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

  // Signed in per call: these tests move the clock by a fortnight.
  const staff = (path, init) =>
    signIn(adminEmail, adminPassword).then((r) => r.json()).then(({ token }) => as(token)(path, init));

  const customer = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Aiko Tanaka', email: 'aiko@example.com' },
  })).json();
  const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();
  const theirs = (path, init) =>
    signIn(customer.email, granted.initialPassword).then((r) => r.json()).then(({ token }) => as(token)(path, init));

  const raise = async (customerId = customer.id) =>
    (await (await staff('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.' },
    })).json());

  const resolve = async (ticket) =>
    (await (await staff(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status: 'resolved', revision: ticket.revision, note: 'We fixed it.' },
    })).json());

  const read = (call) => (id) => call(`/api/v1/tickets/${id}`);
  return { db, now, staff, theirs, customer, raise, resolve, read };
}

test('a customer reads their own ticket, in the shape every other route answers with', async () => {
  const { raise, read, theirs, staff } = await start();
  const ticket = await raise();

  const res = await read(theirs)(ticket.id);
  assert.equal(res.status, 200);
  const mine = await res.json();

  // The same object the queue's row carries. A screen that read a ticket
  // differently depending on the route it arrived by would be two
  // descriptions of one thing.
  const fromTheQueue = (await (await staff('/api/v1/tickets')).json()).items.find((t) => t.id === ticket.id);
  assert.deepEqual(mine, fromTheQueue);
});

test('somebody else’s ticket is the same 404 a missing one gets', async () => {
  const { staff, raise, read, theirs } = await start();
  const other = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Somebody Else', email: 'other@example.com' },
  })).json();
  const notTheirs = await raise(other.id);

  const refused = await read(theirs)(notTheirs.id);
  const missing = await read(theirs)('no-such-ticket');

  assert.equal(refused.status, 404);
  assert.equal(missing.status, 404);
  // Byte for byte, but for the request id: an answer that differed would tell
  // somebody their guess had found a real ticket.
  const [a, b] = [await refused.json(), await missing.json()];
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('a stranger gets 401, not 404', async () => {
  const { raise } = await start();
  const ticket = await raise();
  const url = servers.at(-1).address();
  const res = await fetch(`http://127.0.0.1:${url.port}/api/v1/tickets/${ticket.id}`);

  // Different questions: "who are you" comes before "may you see this", and
  // answering 404 to somebody with no token would say the ticket is missing
  // when what is missing is the token.
  assert.equal(res.status, 401);
});

test('the reopen window is answered by the API, not counted by a screen', async () => {
  const now = movable();
  const { raise, resolve, read, theirs } = await start(now);
  const ticket = await raise();

  // Open: not resolved, so nothing to reopen.
  assert.equal((await (await read(theirs)(ticket.id)).json()).reopenWindowOpen, false);

  const resolved = await resolve(ticket);
  assert.equal((await (await read(theirs)(resolved.id)).json()).reopenWindowOpen, true);

  now.advanceDays(REOPEN_WINDOW_DAYS);
  assert.equal(
    (await (await read(theirs)(resolved.id)).json()).reopenWindowOpen,
    true,
    'the fourteenth day is still inside',
  );

  now.advanceDays(1);
  assert.equal((await (await read(theirs)(resolved.id)).json()).reopenWindowOpen, false);
});

test('allowedTransitions cannot answer the same question, which is why the field exists', async () => {
  const now = movable();
  const { raise, resolve, read, theirs } = await start(now);
  const resolved = await resolve(await raise());
  now.advanceDays(REOPEN_WINDOW_DAYS + 1);

  const late = await (await read(theirs)(resolved.id)).json();

  // Derived from the status alone, so it still lists the move a month later.
  // A screen reading it as "you may reopen this" would promise something the
  // API refuses — and a screen counting fourteen days for itself would be the
  // product rule in two places.
  assert.ok(late.allowedTransitions.includes('reopened'));
  assert.equal(late.reopenWindowOpen, false);
});

test('the desk reads the same field, and it says the same thing', async () => {
  const { raise, resolve, read, staff, theirs } = await start();
  const resolved = await resolve(await raise());

  const asDesk = await (await read(staff)(resolved.id)).json();
  const asCustomer = await (await read(theirs)(resolved.id)).json();

  // A fact about the ticket, not about the reader. An agent's reply does not
  // reopen anything, so a field named for the act — `reopensOnReply` — would
  // have to be false here and true there, which is two answers to one
  // question. The portal knows who its reader is and says what it means.
  assert.equal(asDesk.reopenWindowOpen, true);
  assert.deepEqual(asDesk, asCustomer);
});
