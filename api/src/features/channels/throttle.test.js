// Proves scripts/criteria/channels.md section CHANNELS-3-API: the public
// intake is throttled per address, and it counts arrivals rather than only
// failures.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const servers = [];
after(() => servers.forEach((s) => s.close()));

// A clock the test moves, so a window can elapse without waiting for it. The
// service reads the same one, which is why it is passed in rather than stubbed.
function clock(start = 1_800_000_000) {
  let at = start;
  return { now: () => at, advance: (seconds) => { at += seconds; } };
}

async function start() {
  const db = openDatabase(':memory:');
  seed(db);
  const time = clock();
  const server = composeApp({ db, secret: 'throttle-secret', now: time.now }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  let n = 0;
  const post = (over = {}, channel = 'web') =>
    fetch(`${url}/api/v1/intake/${channel}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // A fresh address each time, so nothing here is measuring the customer
        // uniqueness rule by accident.
        email: `caller-${(n += 1)}@example.com`,
        subject: 'Something is wrong',
        body: 'And I would like it looked at.',
        ...over,
      }),
    });

  const count = (table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
  return { post, time, count };
}

// The ceiling composeApp sets. Read from the behaviour rather than imported:
// the number is policy and this file should fail if the policy changes, not
// silently follow it.
const CEILING = 60;

test('a flood from one address is refused, and says so with the documented code', async () => {
  const { post } = await start();

  for (let i = 0; i < CEILING; i += 1) {
    assert.equal((await post()).status, 201, `request ${i + 1} should still be allowed`);
  }

  const refused = await post();
  assert.equal(refused.status, 429);
  const body = await refused.json();
  assert.equal(body.code, 'RATE_LIMITED');
  assert.ok(body.requestId);
});

test('successes count, which is the difference between this throttle and sign-in', async () => {
  const { post } = await start();

  // Every one of these is a 201. Sign-in counts failures because a success
  // there is a legitimate person arriving; here the successes ARE the flood,
  // and a throttle that only counted refusals could be walked straight past by
  // sending well-formed requests forever.
  for (let i = 0; i < CEILING; i += 1) assert.equal((await post()).status, 201);

  assert.equal((await post()).status, 429);
});

test('refusals count too, so probing does not buy an attacker unlimited attempts', async () => {
  const { post } = await start();

  // Malformed: refused by the service with a 422, long before a ticket exists.
  for (let i = 0; i < CEILING; i += 1) {
    assert.equal((await post({ subject: '   ' })).status, 422);
  }

  // The next request is well-formed and still refused: the counter does not
  // care what the answer was, only that a request arrived.
  assert.equal((await post()).status, 429);
});

test('a throttled request never reaches the service', async () => {
  const { post, count } = await start();

  for (let i = 0; i < CEILING; i += 1) await post();
  const before = { customers: count('customers'), tickets: count('tickets') };

  assert.equal((await post()).status, 429);

  // The check runs before submit, so nothing is resolved and nothing is
  // raised. A throttle that fired after the work had been done would be a
  // status code with no saving behind it.
  assert.equal(count('customers'), before.customers);
  assert.equal(count('tickets'), before.tickets);
});

test('the window reopens on its own, with nobody clearing it', async () => {
  const { post, time } = await start();

  for (let i = 0; i < CEILING; i += 1) await post();
  assert.equal((await post()).status, 429);

  // Expiry is read, not swept: nothing schedules work, and the entry is simply
  // not counted the next time somebody looks at it.
  time.advance(61);
  assert.equal((await post()).status, 201);
});

test('hammering a closed door does not extend the ban', async () => {
  const { post, time } = await start();

  for (let i = 0; i < CEILING; i += 1) await post();
  // Half a window of refusals...
  time.advance(30);
  for (let i = 0; i < 20; i += 1) assert.equal((await post()).status, 429);

  // ...and the window still opens when it was always going to. A refused
  // request never reaches the counter at all, so hammering a shut door cannot
  // push the reset further away. (That the window is anchored to the FIRST
  // arrival rather than the latest is a different claim and needs a different
  // test — the one below. This comment used to make both claims and only
  // proved one, which a mutation caught.)
  time.advance(31);
  assert.equal((await post()).status, 201);
});

test('the window is anchored to the first arrival, not refreshed by the latest', async () => {
  const { post, time } = await start();

  // Half the ceiling now, half thirty seconds later. The window opened with
  // the first of them.
  for (let i = 0; i < CEILING / 2; i += 1) await post();
  time.advance(30);
  for (let i = 0; i < CEILING / 2; i += 1) await post();
  assert.equal((await post()).status, 429);

  // Sixty-one seconds after the FIRST arrival. A window refreshed by the
  // latest one would still be shut here — and would stay shut for as long as
  // requests kept coming, which is a permanent lockout that whoever is
  // flooding you gets to decide the length of.
  time.advance(31);
  assert.equal((await post()).status, 201);
});

test('the throttle does not stand between the desk and its own routes', async () => {
  const { post, time } = await start();
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: 'throttle-secret-2', now: time.now }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  for (let i = 0; i < CEILING + 5; i += 1) await post();

  // Signing in comes through a different counter with a different ceiling, and
  // a public form being flooded must not lock the desk out of its own system.
  const res = await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assert.equal(res.status, 200);
});
