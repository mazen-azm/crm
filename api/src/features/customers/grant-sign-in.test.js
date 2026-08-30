// Proves scripts/criteria/customers.md section CUSTOMERS-6-API — including the
// half that lives in another feature: the ticket ownership guard stops failing
// closed the moment this link exists, and a customer reaching their own ticket
// is what makes the portal possible at all.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'grant-sign-in-secret';
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

  const token = (await (await signIn(adminEmail, adminPassword)).json()).token;

  const as = (tok) => (path, init = {}) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  const staff = as(token);
  const make = async (over = {}) =>
    (await (await staff('/api/v1/customers', {
      method: 'POST',
      body: { name: 'Aiko Tanaka', email: 'aiko@example.com', ...over },
    })).json());

  const count = (table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();
  const row = (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

  return { db, url, staff, as, signIn, make, count, audit, row };
}

test('the grant makes a user, links it, and hands back the password once', async () => {
  const { staff, make, row, count } = await start();
  const customer = await make();
  const users = count('users');

  const res = await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' });
  assert.equal(res.status, 201);
  const granted = await res.json();

  assert.equal(count('users'), users + 1);
  assert.equal(granted.user.role, 'customer');
  assert.equal(granted.user.email, 'aiko@example.com');
  // I-1's link, written: the column exists on customers and points at the row
  // identity made.
  assert.equal(row(customer.id).user_id, granted.user.id);
  // Once, in this answer. The agent is on the phone and reads it out.
  assert.ok(granted.initialPassword.length > 8);
  // And the customer now says so, so a screen can state it rather than
  // offering an action that will be refused.
  assert.equal(granted.customer.hasSignIn, true);
});

test('the granted account signs in, and is a customer rather than a smaller agent', async () => {
  const { staff, make, signIn, as } = await start();
  const customer = await make();
  const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();

  const session = await signIn('aiko@example.com', granted.initialPassword);
  assert.equal(session.status, 200);
  const theCustomer = as((await session.json()).token);

  // They know who they are.
  assert.equal((await theCustomer('/api/v1/me')).status, 200);

  // And nothing else. SC-1 is one organisation and one queue, and the queue
  // belongs to the desk: a customer asking for it is asking for everybody's
  // tickets.
  for (const path of [
    '/api/v1/customers',
    `/api/v1/customers/${customer.id}`,
    `/api/v1/customers/${customer.id}/notes`,
    '/api/v1/tickets',
    '/api/v1/ticket-categories',
    '/api/v1/assignees',
    '/api/v1/accounts',
  ]) {
    assert.equal((await theCustomer(path)).status, 403, `${path} must refuse a customer`);
  }
});

test('a customer reaches their own ticket and nobody else’s, with one answer for both', async () => {
  const { staff, make, signIn, as } = await start();
  const mine = await make();
  const theirs = await make({ name: 'Somebody Else', email: 'other@example.com' });

  const granted = await (await staff(`/api/v1/customers/${mine.id}/sign-in`, { method: 'POST' })).json();
  const theCustomer = as((await (await signIn('aiko@example.com', granted.initialPassword)).json()).token);

  const ownTicket = await (await staff('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: mine.id, subject: 'Mine', body: 'About my account.' },
  })).json();
  const otherTicket = await (await staff('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: theirs.id, subject: 'Theirs', body: 'About theirs.' },
  })).json();

  // The comparison the guard's comment promised, now that there is something
  // to compare against.
  assert.equal((await theCustomer(`/api/v1/tickets/${ownTicket.id}/history`)).status, 200);

  // And somebody else's ticket is byte-identical to a ticket that does not
  // exist. A refusal that told the two apart would confirm to a stranger that
  // somebody else's ticket is there.
  const notMine = await theCustomer(`/api/v1/tickets/${otherTicket.id}/history`);
  const notThere = await theCustomer('/api/v1/tickets/no-such-ticket/history');
  assert.equal(notMine.status, 404);
  assert.equal(notThere.status, 404);
  const [a, b] = [await notMine.json(), await notThere.json()];
  assert.deepEqual({ ...a, requestId: null }, { ...b, requestId: null });
});

test('a customer does not operate the desk, even on their own ticket', async () => {
  const { staff, make, signIn, as } = await start();
  const mine = await make();
  const granted = await (await staff(`/api/v1/customers/${mine.id}/sign-in`, { method: 'POST' })).json();
  const theCustomer = as((await (await signIn('aiko@example.com', granted.initialPassword)).json()).token);

  const ticket = await (await staff('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: mine.id, subject: 'Mine', body: 'About my account.' },
  })).json();

  // Reading their own trail is something a customer does. Handing the ticket
  // to a named agent, or moving it through the state machine, is the desk
  // operating its own queue — no story asks for a customer to do either, and
  // the refusal wears the same 404 so nothing about the answer says which of
  // the two rules stopped it.
  const assign = await theCustomer(`/api/v1/tickets/${ticket.id}/assignee`, {
    method: 'PATCH',
    body: { assigneeId: null, revision: ticket.revision },
  });
  const move = await theCustomer(`/api/v1/tickets/${ticket.id}/status`, {
    method: 'PATCH',
    body: { status: 'open', revision: ticket.revision },
  });
  assert.equal(assign.status, 404);
  assert.equal(move.status, 404);
});

test('staff are not narrowed by any of this', async () => {
  const { staff, make } = await start();
  const customer = await make();
  await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' });

  // Both halves are pinned. A guard that also caught agents would have broken
  // the queue the previous sprint shipped, and only a test on this side sees
  // it.
  assert.equal((await staff('/api/v1/tickets')).status, 200);
  assert.equal((await staff('/api/v1/customers')).status, 200);
  assert.equal((await staff('/api/v1/assignees')).status, 200);
});

test('a customer with no address cannot be granted one, and it names the field', async () => {
  const { staff, make, count } = await start();
  const customer = await make({ email: undefined });
  const users = count('users');

  const res = await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' });
  assert.equal(res.status, 422);
  // I-4: the address is the credential. Inventing one would be inventing an
  // identity.
  assert.deepEqual((await res.json()).fields, ['email']);
  assert.equal(count('users'), users);
});

test('granting twice is refused, rather than making a second account for one person', async () => {
  const { staff, make, count } = await start();
  const customer = await make();
  await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' });
  const users = count('users');

  const again = await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' });
  assert.equal(again.status, 409);
  assert.equal((await again.json()).code, 'CONFLICT');
  assert.equal(count('users'), users);
});

test('a removed customer cannot be granted one', async () => {
  const { staff, make, db, count } = await start();
  const customer = await make();
  db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run('2026-01-01T00:00:00.000Z', customer.id);
  const users = count('users');

  // BR-1: the row is kept for the trail, not for writing to. Same 404 a
  // customer who never existed gets.
  assert.equal((await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).status, 404);
  assert.equal(count('users'), users);
});

test('the trail says who granted it, and carries nothing that opens the account', async () => {
  const { staff, make, audit } = await start();
  const customer = await make();
  const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();

  const written = audit().slice(-2);
  assert.equal(written[0].verb, 'user.create');
  assert.equal(written[1].verb, 'customer.grant_sign_in');
  // Two rows because two things happened, in one transaction. A trail that
  // recorded only the link would answer "who created this user" with silence.
  assert.equal(JSON.parse(written[1].diff).after.userId, granted.user.id);
  for (const r of written) {
    assert.ok(r.actor_id, 'an agent did this, and the trail says so');
    assert.ok(!r.diff.includes(granted.initialPassword), 'the password never enters the trail');
    assert.ok(!/password|hash/i.test(r.diff), 'and neither does anything shaped like one');
  }
});

test('an admin cannot mint a bare customer through the accounts route', async () => {
  const { staff } = await start();

  // A customer user with no customer behind it owns nothing, and the ownership
  // check would refuse it from every ticket including the ones it should see.
  // The role is granted against a customer record or not at all.
  const res = await staff('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'ghost@support-desk.local', name: 'Ghost', role: 'customer' },
  });
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['role']);
});
