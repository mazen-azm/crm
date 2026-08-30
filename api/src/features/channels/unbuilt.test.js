// Proves scripts/criteria/channels.md section CHANNELS-2-API, and rule E-3:
// a channel this system knows about and has decided against says so, rather
// than pretending it never existed.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { DOCUMENTED } from '../../platform/http/errors.js';
import { IMPLEMENTED_CHANNELS, KNOWN_CHANNELS, SPECIFIED_CHANNELS } from './index.js';

const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  seed(db);
  const server = composeApp({ db, secret: 'unbuilt-secret' }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const intake = (channel) =>
    fetch(`${url}/api/v1/intake/${channel}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'someone@example.com',
        subject: 'Anything at all',
        body: 'The body is fine; the channel is the question.',
      }),
    });

  const count = (table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
  return { intake, count };
}

test('a channel this system named and decided against answers 501, and says which', async () => {
  const { intake } = await start();

  for (const channel of SPECIFIED_CHANNELS) {
    const res = await intake(channel);
    assert.equal(res.status, 501, `channel ${channel}`);

    const body = await res.json();
    assert.equal(body.code, 'NOT_IMPLEMENTED');
    // The name travels. E-3's whole point is that the answer says what it is
    // about — "we know what you mean and it is not built" — and a bare code
    // says only the second half.
    assert.equal(body.name, channel);
    // The shared shape holds: E-1 is one shape for every failure, and this is
    // one documented extra key at one status, the way `fields` and `allowed`
    // are.
    assert.ok(body.requestId);
  }
});

test('501 and 404 are different answers to different questions', async () => {
  const { intake } = await start();

  // Not a pedantic distinction. 404 says "there is no such thing", and about a
  // channel somebody considered and rejected, that is untrue — it hides a
  // decision behind a shrug. The two statuses are the difference between "not
  // built" and "never heard of".
  const decidedAgainst = await intake('whatsapp');
  const neverHeardOf = await intake('pigeon-post');

  assert.equal(decidedAgainst.status, 501);
  assert.equal(neverHeardOf.status, 404);
  assert.equal((await neverHeardOf.json()).code, 'NOT_FOUND');
  // And the 404 names nothing, because there is nothing to name.
  assert.equal((await intake('pigeon-post')).status, 404);
});

test('an unbuilt channel writes nothing — not a customer, not a ticket', async () => {
  const { intake, count } = await start();
  const before = { customers: count('customers'), tickets: count('tickets') };

  await intake('email');

  // The channel is decided before anything else happens, so a request to one
  // that does not exist cannot leave a customer behind the way an unvalidated
  // intake would.
  assert.equal(count('customers'), before.customers);
  assert.equal(count('tickets'), before.tickets);
});

test('the built channel still works, which is the half a split answer can break', async () => {
  const { intake } = await start();

  for (const channel of IMPLEMENTED_CHANNELS) {
    assert.equal((await intake(channel)).status, 201, `channel ${channel}`);
  }
});

test('the three names come from the brief, and the lists do not overlap', async () => {
  // A name in both lists would answer 201 and 501 depending on which check ran
  // first — the kind of contradiction that reads fine in each file on its own.
  const overlap = SPECIFIED_CHANNELS.filter((c) => IMPLEMENTED_CHANNELS.includes(c));
  assert.deepEqual(overlap, []);
  assert.deepEqual([...KNOWN_CHANNELS].sort(), [...IMPLEMENTED_CHANNELS, ...SPECIFIED_CHANNELS].sort());
  // docs/product-brief.md:137 puts these three under "Specified only".
  assert.deepEqual([...SPECIFIED_CHANNELS].sort(), ['email', 'sms', 'whatsapp']);
});

test('501 is in the catalogue rule E-2 names, not a status invented at the edge', () => {
  // E-2 says every failure returns its DOCUMENTED code. A route answering a
  // status outside the catalogue would be a second error contract, which is
  // exactly what the HttpError constructor refuses.
  assert.equal(DOCUMENTED[501], 'NOT_IMPLEMENTED');
});
