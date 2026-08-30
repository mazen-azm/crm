// Proves scripts/criteria/tickets.md section TICKETS-11-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { REOPEN_WINDOW_DAYS } from './tickets.rules.js';

const SECRET = 'reopen-secret';
const DAY = 24 * 60 * 60;
const servers = [];
after(() => servers.forEach((s) => s.close()));

// A clock the test moves, so a fortnight can pass without waiting for one.
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

  // Signed in freshly on every call, because these tests move the clock by a
  // fortnight and a token does not outlive that — which is true of the product
  // too: coming back after two weeks means signing in again.
  const staff = (path, init) =>
    signIn(adminEmail, adminPassword)
      .then((r) => r.json())
      .then(({ token }) => as(token)(path, init));

  // A customer with a sign-in, and a ticket of their own.
  const customer = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Aiko Tanaka', email: 'aiko@example.com' },
  })).json();
  const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();
  const theirs = (path, init) =>
    signIn(customer.email, granted.initialPassword)
      .then((r) => r.json())
      .then(({ token }) => as(token)(path, init));

  const raise = async (customerId = customer.id) =>
    (await (await staff('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Something is wrong', body: 'Body.' },
    })).json());

  const move = (call) => (id, body) => call(`/api/v1/tickets/${id}/status`, { method: 'PATCH', body });
  const resolve = async (ticket, note = 'We fixed it.') =>
    (await (await move(staff)(ticket.id, {
      status: 'resolved',
      revision: ticket.revision,
      note,
    })).json());

  const row = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);

  return { db, now, staff, theirs, customer, raise, resolve, move, row, as, signIn };
}

test('a customer reopens their own resolved ticket inside the window', async () => {
  const { raise, resolve, move, theirs, row } = await start();
  const resolved = await resolve(await raise());
  assert.equal(resolved.status, 'resolved');

  const res = await move(theirs)(resolved.id, { status: 'reopened', revision: resolved.revision });
  assert.equal(res.status, 200);
  const reopened = await res.json();

  assert.equal(reopened.status, 'reopened');
  // The note records what was done when it was resolved, and that stays true.
  assert.equal(reopened.resolutionNote, 'We fixed it.');
  assert.equal(row(resolved.id).resolution_note, 'We fixed it.');
  // And the resolution moment is cleared, so the next resolve measures from
  // itself rather than from a fortnight ago.
  assert.equal(row(resolved.id).resolved_at, null);
});

test('the window runs from the resolution, and closes on the fourteenth day', async () => {
  const now = movable();
  const { raise, resolve, move, theirs } = await start(now);
  const resolved = await resolve(await raise());

  now.advanceDays(REOPEN_WINDOW_DAYS);
  const justInside = await move(theirs)(resolved.id, { status: 'reopened', revision: resolved.revision });
  assert.equal(justInside.status, 200, 'exactly fourteen days is still inside');
});

test('a day too late is refused, and the ticket stays resolved', async () => {
  const now = movable();
  const { raise, resolve, move, theirs, row } = await start(now);
  const resolved = await resolve(await raise());

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  const res = await move(theirs)(resolved.id, { status: 'reopened', revision: resolved.revision });

  assert.equal(res.status, 409);
  const body = await res.json();
  // Not ILLEGAL_TRANSITION: the move is legal and the moment is not, and a
  // refusal that said otherwise would tell somebody the wrong thing about why.
  assert.equal(body.code, 'REOPEN_WINDOW_CLOSED');
  assert.equal(row(resolved.id).status, 'resolved');
});

test('the window is measured from the resolution, not from the last touch', async () => {
  const now = movable();
  const { raise, resolve, move, theirs, staff } = await start(now);
  const ticket = await raise();
  const resolved = await resolve(ticket);

  // Thirteen days pass, then somebody touches the ticket. updated_at moves;
  // the window must not.
  now.advanceDays(13);
  const assigned = await (await staff(`/api/v1/tickets/${resolved.id}/assignee`, {
    method: 'PATCH',
    body: { assigneeId: null, revision: resolved.revision },
  })).json();

  now.advanceDays(2); // day fifteen since the resolution, day two since the touch
  const res = await move(theirs)(assigned.id, { status: 'reopened', revision: assigned.revision });

  // A window any activity resets is not a window.
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REOPEN_WINDOW_CLOSED');
});

test('the window applies to the desk too, because it is a fact about the ticket', async () => {
  const now = movable();
  const { raise, resolve, move, staff } = await start(now);
  const resolved = await resolve(await raise());

  now.advanceDays(REOPEN_WINDOW_DAYS + 1);
  const res = await move(staff)(resolved.id, { status: 'reopened', revision: resolved.revision });

  // T-6 closes a resolved ticket after the same fourteen days, so afterwards
  // there is nothing to reopen anyway. Two rules for one period, differing by
  // who asks, would be two answers to when a resolution becomes final.
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REOPEN_WINDOW_CLOSED');
});

test('a customer may reopen and may do nothing else, with one answer for all of it', async () => {
  const { raise, resolve, move, theirs, row } = await start();
  const ticket = await raise();

  // Resolving, closing, moving to pending — the desk saying something about
  // work it is doing. Refused with the same 404 as a ticket that is not there,
  // so nothing about the answer says which rule stopped them.
  //
  // Each request is WELL-FORMED, including the note T-4 requires on a resolve.
  // The shape check runs before anything is read — deliberately, so nothing
  // malformed reaches the transaction — so a malformed request gets its 422
  // whoever sends it. That leaks nothing about the ticket: it is a rule of the
  // API, stated in the document anybody can read.
  const attempts = [
    { status: 'resolved', note: 'I think this is done.' },
    { status: 'pending' },
    { status: 'open' },
  ];
  for (const attempt of attempts) {
    const res = await move(theirs)(ticket.id, { ...attempt, revision: ticket.revision });
    assert.equal(res.status, 404, attempt.status);
    assert.equal((await res.json()).code, 'NOT_FOUND', attempt.status);
  }
  assert.equal(row(ticket.id).status, 'new');

  const resolved = await resolve(ticket);
  assert.equal((await move(theirs)(resolved.id, { status: 'closed', revision: resolved.revision })).status, 404);
});

test('somebody else’s resolved ticket is the same 404', async () => {
  const { staff, raise, resolve, move, theirs } = await start();
  const other = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Somebody Else', email: 'other@example.com' },
  })).json();
  const resolved = await resolve(await raise(other.id));

  const res = await move(theirs)(resolved.id, { status: 'reopened', revision: resolved.revision });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, 'NOT_FOUND');
});

test('a ticket that is not resolved cannot be reopened, and the refusal names what is legal', async () => {
  const { raise, move, staff } = await start();
  const ticket = await raise();

  const res = await move(staff)(ticket.id, { status: 'reopened', revision: ticket.revision });
  assert.equal(res.status, 409);
  const body = await res.json();
  // T-7: the refusal names the legal moves from where the ticket IS.
  assert.equal(body.code, 'ILLEGAL_TRANSITION');
  assert.deepEqual(body.allowed, ['open', 'pending', 'resolved']);
});

test('a closed ticket stays closed, window or no window', async () => {
  const { raise, resolve, move, staff, theirs } = await start();
  const resolved = await resolve(await raise());
  const closed = await (await move(staff)(resolved.id, { status: 'closed', revision: resolved.revision })).json();

  for (const call of [staff, theirs]) {
    const res = await move(call)(closed.id, { status: 'reopened', revision: closed.revision });
    // Closed is terminal — an edge back out would make the window unbounded,
    // which is the argument TICKETS-4-API already made.
    assert.equal([404, 409].includes(res.status), true);
    if (res.status === 409) assert.deepEqual((await res.json()).allowed, []);
  }
});

test('resolving twice measures the window from the second resolution', async () => {
  const now = movable();
  const { raise, resolve, move, theirs, staff } = await start(now);
  const first = await resolve(await raise());

  now.advanceDays(10);
  const reopened = await (await move(theirs)(first.id, { status: 'reopened', revision: first.revision })).json();

  // Resolved again, ten days after the first resolution.
  const second = await (await move(staff)(reopened.id, {
    status: 'resolved',
    revision: reopened.revision,
    note: 'We fixed it properly this time.',
  })).json();

  // Ten more days: twenty since the first resolution, ten since the second.
  now.advanceDays(10);
  const res = await move(theirs)(second.id, { status: 'reopened', revision: second.revision });

  // Inside the window, because the window belongs to THIS resolution. A
  // resolved_at that was written once and never cleared would refuse this.
  assert.equal(res.status, 200);
});

test('the resolution moment is cleared when the ticket leaves resolved', async () => {
  const { raise, resolve, move, theirs, row } = await start();
  const resolved = await resolve(await raise());
  assert.ok(row(resolved.id).resolved_at, 'set on the way in');

  await move(theirs)(resolved.id, { status: 'reopened', revision: resolved.revision });

  // Cleared on the way out, so the next resolve measures from itself rather
  // than from the first one.
  assert.equal(row(resolved.id).resolved_at, null);
});
