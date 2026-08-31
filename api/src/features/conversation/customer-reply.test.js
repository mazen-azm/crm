// Proves scripts/criteria/conversation.md section CONVERSATION-3-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { REOPEN_WINDOW_DAYS } from '../tickets/index.js';

const SECRET = 'customer-reply-secret';
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

  // Signed in on every call: these tests move the clock by a fortnight, and a
  // token does not outlive that.
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

  const reply = (call) => (id, body) => call(`/api/v1/tickets/${id}/replies`, { method: 'POST', body: { body } });
  const row = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const clock = (id) =>
    db.prepare("SELECT * FROM sla_clocks WHERE ticket_id = ? AND kind = 'first_response'").get(id);
  const messages = (id) =>
    db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY rowid').all(id);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, now, staff, theirs, customer, raise, resolve, reply, row, clock, messages, audit };
}

test('a customer replies on their own ticket, and it is public', async () => {
  const { raise, reply, theirs, messages } = await start();
  const ticket = await raise();

  const res = await reply(theirs)(ticket.id, '  It is still happening.  ');
  assert.equal(res.status, 201);
  const { message } = await res.json();

  assert.equal(message.kind, 'public');
  assert.equal(message.body, 'It is still happening.');
  assert.equal(messages(ticket.id).length, 1);
});

test('the kind is not the customer’s to choose', async () => {
  const { raise, theirs, messages } = await start();
  const ticket = await raise();

  // Reading the kind from the body and trusting it would let a customer write
  // an internal note — into the one place the desk talks to itself.
  await theirs(`/api/v1/tickets/${ticket.id}/replies`, {
    method: 'POST',
    body: { body: 'Sneaking one in.', kind: 'internal', authorId: 'somebody-else' },
  });

  const [written] = messages(ticket.id);
  assert.equal(written.kind, 'public');
  // And the author is the authenticated customer, not whatever was sent.
  assert.notEqual(written.author_id, 'somebody-else');
});

test('replying to a resolved ticket inside the window reopens it', async () => {
  const now = movable();
  const { raise, resolve, reply, theirs, row, audit } = await start(now);
  const resolved = await resolve(await raise());
  now.advanceDays(REOPEN_WINDOW_DAYS - 1);
  const before = audit().length;

  const res = await reply(theirs)(resolved.id, 'It came back.');
  assert.equal(res.status, 201);

  assert.equal(row(resolved.id).status, 'reopened');
  // Two rows: the reply, and the status move — audited like any other status
  // change, by the feature that owns the transitions table.
  const written = audit().slice(before);
  assert.deepEqual(written.map((r) => r.verb), ['ticket.reply', 'ticket.status']);
  assert.equal(JSON.parse(written[1].diff).after.status, 'reopened');
  // The note records what was done when it was resolved, and stays true.
  assert.equal(row(resolved.id).resolution_note, 'We fixed it.');
});

test('outside the window the reply is refused, and nothing is written', async () => {
  const now = movable();
  const { raise, resolve, reply, theirs, row, messages, audit } = await start(now);
  const resolved = await resolve(await raise());
  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  const before = audit().length;

  const res = await reply(theirs)(resolved.id, 'It came back.');

  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REOPEN_WINDOW_CLOSED');
  // One transaction: no message either. A reply that was stored while the
  // reopen it was meant to cause was refused would leave the customer
  // believing they had been heard.
  assert.equal(messages(resolved.id).length, 0);
  assert.equal(row(resolved.id).status, 'resolved');
  assert.equal(audit().length, before);
});

test('a closed ticket takes no reply', async () => {
  const now = movable();
  const { staff, raise, resolve, reply, theirs, messages } = await start(now);
  const resolved = await resolve(await raise());
  const closed = await (await staff(`/api/v1/tickets/${resolved.id}/status`, {
    method: 'PATCH',
    body: { status: 'closed', revision: resolved.revision },
  })).json();

  const res = await reply(theirs)(closed.id, 'One more thing.');

  // Closed is terminal — TICKETS-4-API's argument, and a reply is not a way
  // round it. Refused rather than stored-and-ignored: a customer replying to a
  // closed ticket means to reopen it, and keeping the message while the reopen
  // cannot happen would leave them believing they had been heard.
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, 'ILLEGAL_TRANSITION');
  // From closed, nothing is legal — the same answer the state machine gives.
  assert.deepEqual(body.allowed, []);
  assert.equal(messages(closed.id).length, 0);
});

test('a customer’s reply stops no clock', async () => {
  const { raise, reply, theirs, clock, row } = await start();
  const ticket = await raise();

  await reply(theirs)(ticket.id, 'Anybody there?');

  // T-2's promise is about the desk answering. A customer answering themselves
  // is not that, and a clock stopped by it would report a response time to
  // nobody's credit.
  assert.equal(clock(ticket.id).stopped_at, null);
  // And it does not open the ticket either — that is the same promise.
  assert.equal(row(ticket.id).status, 'new');
});

test('an agent’s reply still does both, on the same route', async () => {
  const { staff, raise, reply, clock, row } = await start();
  const ticket = await raise();

  await reply(staff)(ticket.id, 'We are looking at it.');

  // One route, one message table. What the reply DOES depends on who wrote it,
  // and both halves are pinned — a change that gave the customer's behaviour
  // to everybody would break the desk's promise silently.
  assert.ok(clock(ticket.id).stopped_at);
  assert.equal(row(ticket.id).status, 'open');
});

test('somebody else’s ticket is the same 404 a missing one gets', async () => {
  const { staff, raise, reply, theirs } = await start();
  const other = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Somebody Else', email: 'other@example.com' },
  })).json();
  const notTheirs = await raise(other.id);

  const refused = await reply(theirs)(notTheirs.id, 'Let me in.');
  const missing = await reply(theirs)('no-such-ticket', 'Let me in.');
  assert.equal(refused.status, 404);
  assert.equal(missing.status, 404);
  const [a, b] = [await refused.json(), await missing.json()];
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('a blank reply from a customer is refused like any other', async () => {
  const { raise, reply, theirs, messages } = await start();
  const ticket = await raise();

  for (const body of ['', '   ', null, 42]) {
    const res = await reply(theirs)(ticket.id, body);
    assert.equal(res.status, 422, JSON.stringify(body));
    assert.deepEqual((await res.json()).fields, ['body']);
  }
  assert.equal(messages(ticket.id).length, 0);
});

test('a reply on a pending ticket leaves the status alone', async () => {
  const { staff, raise, reply, theirs, row } = await start();
  const ticket = await raise();
  await staff(`/api/v1/tickets/${ticket.id}/status`, {
    method: 'PATCH',
    body: { status: 'pending', revision: ticket.revision },
  });

  await reply(theirs)(ticket.id, 'Here is what you asked for.');

  // Pending means waiting on the customer, and this is the customer answering
  // — which is exactly the case where somebody might expect a move. T-5 names
  // one transition and this makes no others.
  assert.equal(row(ticket.id).status, 'pending');
});

test('the desk may still write on a closed ticket', async () => {
  const now = movable();
  const { staff, raise, resolve, reply, messages } = await start(now);
  const resolved = await resolve(await raise());
  const closed = await (await staff(`/api/v1/tickets/${resolved.id}/status`, {
    method: 'PATCH',
    body: { status: 'closed', revision: resolved.revision },
  })).json();

  // Only the customer is refused, and the asymmetry is the point: their reply
  // means to reopen a ticket that cannot be reopened. An agent writing on a
  // closed ticket implies nothing about its status — it is a record of
  // something said, on a ticket the desk has finished with.
  assert.equal((await reply(staff)(closed.id, 'For the record.')).status, 201);
  assert.equal(messages(closed.id).length, 1);
});
