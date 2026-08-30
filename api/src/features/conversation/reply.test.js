// Proves scripts/criteria/conversation.md section CONVERSATION-1-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'reply-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// A clock that moves one second every time it is read.
//
// The fixed clock the other tests use cannot tell "stopped at the reply's
// timestamp" from "stopped at whenever the stopping code ran" — both are the
// same number. A mutation that changed one into the other stayed green, which
// is what this exists to catch.
const ticking = (from = 1_800_000_000) => {
  let t = from - 1;
  return () => (t += 1);
};

async function start({ now = () => 1_800_000_000 } = {}) {
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

  const staff = as((await (await signIn(adminEmail, adminPassword)).json()).token);
  const customerId = (await (await staff('/api/v1/customers?limit=1')).json()).items[0].id;

  const raise = async (subject = 'Something is wrong') =>
    (await (await staff('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject, body: 'Body.' },
    })).json());

  const reply = (id, body) => staff(`/api/v1/tickets/${id}/replies`, { method: 'POST', body: { body } });
  const ticketRow = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const clock = (id, kind = 'first_response') =>
    db.prepare('SELECT * FROM sla_clocks WHERE ticket_id = ? AND kind = ?').get(id, kind);
  const messages = (id) =>
    db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY rowid').all(id);
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, staff, as, signIn, customerId, raise, reply, ticketRow, clock, messages, audit };
}

test('a reply is stored with its author, its body and its kind', async () => {
  const { raise, reply, messages } = await start();
  const ticket = await raise();

  const res = await reply(ticket.id, '  We are looking at it.  ');
  assert.equal(res.status, 201);
  const message = await res.json();

  assert.equal(message.ticketId, ticket.id);
  assert.ok(message.authorId);
  assert.equal(message.kind, 'public');
  // Stored trimmed, the way a customer note is: " ok " and "ok" are the same
  // message, and the difference only shows up as a puzzling diff later.
  assert.equal(message.body, 'We are looking at it.');
  assert.equal(messages(ticket.id).length, 1);
});

test('the first public reply opens a new ticket and stops the response clock', async () => {
  const { raise, reply, ticketRow, clock } = await start();
  const ticket = await raise();
  assert.equal(ticket.status, 'new');
  assert.equal(clock(ticket.id).stopped_at, null);

  const message = await (await reply(ticket.id, 'We are looking at it.')).json();

  assert.equal(ticketRow(ticket.id).status, 'open');
  // At the REPLY's own timestamp. S-1 measures the promise from the ticket's
  // creation to the answer, and the answer is the message — not whenever the
  // stopping code happened to run.
  assert.equal(clock(ticket.id).stopped_at, message.createdAt);
});

test('a second reply changes neither, because neither is still there to change', async () => {
  const { raise, reply, ticketRow, clock, audit } = await start();
  const ticket = await raise();
  const first = await (await reply(ticket.id, 'We are looking at it.')).json();
  const before = audit().length;

  await reply(ticket.id, 'Still looking.');

  // "Once" is a property of the clock and of the status, not of a count. The
  // clock's stop matches `stopped_at IS NULL` and the status move matches
  // `status = 'new'`; the second reply finds neither.
  assert.equal(clock(ticket.id).stopped_at, first.createdAt);
  assert.equal(ticketRow(ticket.id).status, 'open');
  // One audit row for the second reply, not two: no status moved.
  assert.equal(audit().length, before + 1);
});

test('a reply on a ticket that is not new leaves the status alone', async () => {
  const { staff, raise, reply, ticketRow } = await start();
  const ticket = await raise();
  await staff(`/api/v1/tickets/${ticket.id}/status`, {
    method: 'PATCH',
    body: { status: 'pending', revision: ticket.revision },
  });

  await reply(ticket.id, 'A reply while it is pending.');

  // T-2 names one transition and this route invents no others.
  assert.equal(ticketRow(ticket.id).status, 'pending');
});

test('the reply, the clock and the status move commit together', async () => {
  const { raise, reply, ticketRow, clock, audit, messages } = await start();
  const ticket = await raise();
  const before = audit().length;

  await reply(ticket.id, 'We are looking at it.');

  // Two rows: the reply and the status move T-2 requires. Both, or neither —
  // one transaction, which is why the methods this calls on the tickets and
  // service-levels features open none of their own. A sequence that committed
  // the reply and then moved the status would have a failure mode where a
  // ticket has been answered and does not say so.
  const written = audit().slice(before);
  assert.deepEqual(written.map((r) => r.verb), ['ticket.reply', 'ticket.status']);
  assert.equal(JSON.parse(written[1].diff).after.status, 'open');
  assert.equal(messages(ticket.id).length, 1);
  assert.ok(clock(ticket.id).stopped_at);
  assert.equal(ticketRow(ticket.id).status, 'open');
});

test('the trail records the reply without its body', async () => {
  const { raise, reply, audit } = await start();
  const ticket = await raise();

  const message = await (await reply(ticket.id, 'Something a customer said in confidence.')).json();

  const row = audit().find((r) => r.verb === 'ticket.reply');
  assert.equal(JSON.parse(row.diff).after.messageId, message.id);
  // A trail is a record of what happened. The message itself is a row anybody
  // entitled to read it can read, and copying it here would put it somewhere
  // with different rules about who may.
  assert.ok(!row.diff.includes('confidence'));
  assert.ok(row.actor_id, 'and it says who replied');
});

test('a blank body is refused, and writes nothing', async () => {
  const { raise, reply, messages, audit, ticketRow } = await start();
  const ticket = await raise();
  const before = audit().length;

  for (const body of [undefined, null, '', '   ', 42, 'x'.repeat(10_001)]) {
    const res = await reply(ticket.id, body);
    assert.equal(res.status, 422, `body ${JSON.stringify(body)?.slice(0, 20)}`);
    assert.deepEqual((await res.json()).fields, ['body']);
  }

  assert.equal(messages(ticket.id).length, 0);
  assert.equal(audit().length, before);
  // And nothing was opened by a reply that never happened.
  assert.equal(ticketRow(ticket.id).status, 'new');
});

test('a ticket nobody has is the same 404 every route under a ticket gives', async () => {
  const { reply } = await start();
  const res = await reply('no-such-ticket', 'Anything.');
  assert.equal(res.status, 404);
  assert.deepEqual(Object.keys(await res.json()).sort(), ['code', 'requestId']);
});

test('a customer is refused, in this story, with that same 404', async () => {
  const { staff, as, signIn, customerId, raise } = await start();
  const customer = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Aiko Tanaka', email: 'aiko@example.com' },
  })).json();
  const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();
  const theirs = as((await (await signIn('aiko@example.com', granted.initialPassword)).json()).token);

  const mine = await (await staff('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'Theirs', body: 'Body.' },
  })).json();
  const other = await raise();
  void customerId;

  // Their own ticket and somebody else's, both 404 — replying is theirs to do
  // and it is CONVERSATION-3-API's rule, with a different effect. Nothing
  // about the answer says which of the two refusals it was.
  for (const id of [mine.id, other.id]) {
    const res = await theirs(`/api/v1/tickets/${id}/replies`, {
      method: 'POST',
      body: { body: 'Let me in.' },
    });
    assert.equal(res.status, 404, id);
    assert.equal((await res.json()).code, 'NOT_FOUND');
  }
});

test('the clock stop belongs to service-levels, and stops once', async () => {
  const { db, raise, reply, clock } = await start();
  const { createServiceLevels } = await import('../service-levels/index.js');
  const sla = createServiceLevels({ db, now: () => 1_800_000_000 });
  const ticket = await raise();

  assert.equal(sla.stopClock({ ticketId: ticket.id, kind: 'first_response', at: '2026-01-01T00:00:00.000Z' }), true);
  // A second call changes nothing and says so — `stopped_at IS NULL` in the
  // WHERE is the whole guarantee.
  assert.equal(sla.stopClock({ ticketId: ticket.id, kind: 'first_response', at: '2026-02-02T00:00:00.000Z' }), false);
  assert.equal(clock(ticket.id).stopped_at, '2026-01-01T00:00:00.000Z');

  // And a reply afterwards does not move it either.
  await reply(ticket.id, 'A reply after the clock was already stopped.');
  assert.equal(clock(ticket.id).stopped_at, '2026-01-01T00:00:00.000Z');

  assert.throws(() => sla.stopClock({ ticketId: ticket.id, kind: 'wizard', at: '2026-01-01T00:00:00.000Z' }));
});

test('the resolution clock is untouched by a reply', async () => {
  const { raise, reply, clock } = await start();
  const ticket = await raise();

  await reply(ticket.id, 'We are looking at it.');

  // T-2 is about the first response. Resolving is a different promise with a
  // different clock, and answering somebody is not resolving their problem.
  assert.equal(clock(ticket.id, 'resolution').stopped_at, null);
});

test('the clock stops at the reply’s timestamp, not at whenever the stop ran', async () => {
  const { raise, reply, clock } = await start({ now: ticking() });
  const ticket = await raise();

  const message = await (await reply(ticket.id, 'We are looking at it.')).json();

  // With a clock that moves, these are two different numbers unless the stop
  // was given the message's own `at`. S-1 measures the promise from the
  // ticket's creation to the answer, and the answer is the message.
  assert.equal(clock(ticket.id).stopped_at, message.createdAt);
});
