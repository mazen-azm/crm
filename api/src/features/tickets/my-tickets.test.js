// Proves the API half of scripts/criteria/portal.md section PORTAL-2-WEB.
//
// That story is declared WEB-only and needs CUSTOMERS-6-API and TICKETS-8-API,
// and neither answers "what are MY tickets" — nothing in scripts/backlog.txt
// does. The route was written with the story because the story cannot exist
// without it; this file is why it is safe.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'my-tickets-secret';
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

  const staff = as((await (await signIn(adminEmail, adminPassword)).json()).token);

  // A customer with a sign-in, made the way the product makes one.
  const make = async (name, email) => {
    const customer = await (await staff('/api/v1/customers', {
      method: 'POST',
      body: { name, email },
    })).json();
    const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, {
      method: 'POST',
    })).json();
    const token = (await (await signIn(email, granted.initialPassword)).json()).token;
    return { customer, call: as(token) };
  };

  const raise = (customerId, subject) =>
    staff('/api/v1/tickets', { method: 'POST', body: { customerId, subject, body: 'Body.' } });

  return { db, staff, make, raise, as };
}

test('a customer sees their own tickets, and only their own', async () => {
  const { staff, make, raise } = await start();
  const mine = await make('Aiko Tanaka', 'aiko@example.com');
  const theirs = await make('Somebody Else', 'other@example.com');

  const a = await (await raise(mine.customer.id, 'Mine one')).json();
  const b = await (await raise(mine.customer.id, 'Mine two')).json();
  await raise(theirs.customer.id, 'Theirs');

  const page = await (await mine.call('/api/v1/me/tickets')).json();

  assert.deepEqual(page.items.map((t) => t.id).sort(), [a.id, b.id].sort());
  // The total counts what they own, not what the desk holds.
  assert.equal(page.total, 2);
  // The same envelope every list here answers with (BR-4).
  assert.deepEqual(Object.keys(page).sort(), ['items', 'limit', 'offset', 'total']);

  // And the desk still sees all three.
  assert.equal((await (await staff('/api/v1/tickets')).json()).total >= 3, true);
});

test('the customer comes from the subject, and a parameter cannot change it', async () => {
  const { make, raise } = await start();
  const mine = await make('Aiko Tanaka', 'aiko@example.com');
  const theirs = await make('Somebody Else', 'other@example.com');
  await raise(theirs.customer.id, 'Theirs');
  await raise(mine.customer.id, 'Mine');

  // Every shape somebody might try. The filter is not a parameter this route
  // reads — it is supplied from the token — so none of these does anything.
  for (const query of [
    `?customerId=${theirs.customer.id}`,
    `?customer_id=${theirs.customer.id}`,
    `?assigneeId=none&customerId=${theirs.customer.id}`,
  ]) {
    const page = await (await mine.call(`/api/v1/me/tickets${query}`)).json();
    assert.equal(page.total, 1, `query ${query} must not widen the answer`);
    assert.equal(page.items[0].subject, 'Mine');
  }
});

test('a customer subject with nothing linked to it sees nothing, not everything', async () => {
  const { db, make, raise } = await start();
  const mine = await make('Aiko Tanaka', 'aiko@example.com');
  const theirs = await make('Somebody Else', 'other@example.com');
  await raise(theirs.customer.id, 'Theirs');
  await raise(mine.customer.id, 'Mine');

  // Nothing the product can do creates this: a customer role is only ever
  // granted against a customer record, and the grant writes the link in the
  // same transaction. Broken here on purpose, because the guard against it is
  // a claim otherwise — and the failure it prevents is a customer reading
  // everybody's tickets, which is the worst answer this route could give.
  db.prepare('UPDATE customers SET user_id = NULL WHERE id = ?').run(mine.customer.id);

  const page = await (await mine.call('/api/v1/me/tickets')).json();
  assert.deepEqual(page.items, []);
  assert.equal(page.total, 0);
});

test('staff are refused: they have the queue', async () => {
  const { staff } = await start();

  // Not an oversight. Answering this for a subject with no customer behind it
  // would be a second way to ask one question, and the queue is the route that
  // already answers it for the desk.
  const res = await staff('/api/v1/me/tickets');
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'FORBIDDEN');
});

test('no token is 401, not an empty page', async () => {
  const { as } = await start();
  assert.equal((await as(null)('/api/v1/me/tickets')).status, 401);
});

test('a customer still cannot reach the queue, the staff list or another customer', async () => {
  const { make } = await start();
  const mine = await make('Aiko Tanaka', 'aiko@example.com');

  // The screen not offering these is not the enforcement (SC-2). This is.
  for (const path of ['/api/v1/tickets', '/api/v1/assignees', '/api/v1/customers']) {
    assert.equal((await mine.call(path)).status, 403, path);
  }
});

test('the page is the API’s window, and a filter the rules refuse is refused', async () => {
  const { make, raise } = await start();
  const mine = await make('Aiko Tanaka', 'aiko@example.com');
  for (const n of [1, 2, 3]) await raise(mine.customer.id, `Ticket ${n}`);

  const first = await (await mine.call('/api/v1/me/tickets?limit=2&offset=0')).json();
  assert.equal(first.items.length, 2);
  assert.equal(first.total, 3);
  assert.equal(first.limit, 2);

  const second = await (await mine.call('/api/v1/me/tickets?limit=2&offset=2')).json();
  assert.equal(second.items.length, 1);

  // BR-4: the ceiling refuses rather than clamping, the same way it does for
  // the desk — because it is the same code.
  assert.equal((await mine.call('/api/v1/me/tickets?limit=500')).status, 422);
  // And a status the rules do not name is refused, not ignored.
  assert.equal((await mine.call('/api/v1/me/tickets?status=wizard')).status, 422);
});

test('a customer filters their own list the way the desk filters the queue', async () => {
  const { staff, make, raise } = await start();
  const mine = await make('Aiko Tanaka', 'aiko@example.com');
  const open = await (await raise(mine.customer.id, 'To be opened')).json();
  await raise(mine.customer.id, 'Left new');

  await staff(`/api/v1/tickets/${open.id}/status`, {
    method: 'PATCH',
    body: { status: 'open', revision: open.revision },
  });

  const page = await (await mine.call('/api/v1/me/tickets?status=open')).json();
  assert.equal(page.total, 1);
  assert.equal(page.items[0].id, open.id);
});
