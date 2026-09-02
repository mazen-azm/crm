// Proves scripts/criteria/reports.md section REPORTS-2-API.
//
// Every state in here is produced by driving the real routes and the real
// sweep — a reply stops the first-response clock, resolving stops the
// resolution one, and POST /tickets/sweep-breaches writes the breach rows.
// Inserting the rows by hand would test the arithmetic against a fixture of
// this test's own opinion about what the desk records.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { CLOCK_KINDS } from '../service-levels/index.js';

const SECRET = 'promise-share-secret';
const HOUR = 60 * 60;
const servers = [];
after(() => servers.forEach((s) => s.close()));

const movable = (from = 1_800_000_000) => {
  let at = from;
  const now = () => at;
  now.advanceHours = (hours) => { at += hours * HOUR; };
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

  // Signed in per call: these tests move the clock past a token's life.
  const admin = (path, init) =>
    signIn(adminEmail, adminPassword).then((r) => r.json()).then(({ token }) => as(token)(path, init));

  const customerId = (await (await admin('/api/v1/customers?limit=1')).json()).items[0].id;

  const raise = async (subject = 'Something is wrong') =>
    (await (await admin('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject, body: 'Body.' },
    })).json());

  const reply = (ticket) =>
    admin(`/api/v1/tickets/${ticket.id}/replies`, { method: 'POST', body: { body: 'On it.' } });

  const resolve = (ticket) =>
    admin(`/api/v1/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status: 'resolved', revision: ticket.revision, note: 'Fixed.' },
    });

  const sweep = () => admin('/api/v1/tickets/sweep-breaches', { method: 'POST' });
  const share = (call = admin) => call('/api/v1/reports/promise-share');

  return { db, admin, signIn, as, raise, reply, resolve, sweep, share, now };
}

test('a desk where nothing has finished says so, rather than saying nothing was met', async () => {
  const { raise, share } = await start();
  await raise();

  const { kinds } = await (await share()).json();

  for (const kind of CLOCK_KINDS) {
    assert.equal(kinds[kind].met, 0);
    assert.equal(kinds[kind].breached, 0);
    assert.equal(kinds[kind].settled, 0);
    // Null and not 0. A period in which nothing settled is not a desk that
    // missed everything, and the two are the same shape once a percentage has
    // been rounded onto a screen.
    assert.equal(kinds[kind].share, null);
  }
});

test('a promise still running is on neither side of the fraction', async () => {
  const { raise, reply, share } = await start();

  const answered = await raise('Answered');
  await reply(answered);
  // Raised and left alone, inside its deadline: not kept, not broken.
  await raise('Still open');

  const { kinds } = await (await share()).json();
  const first = kinds.first_response;

  assert.equal(first.met, 1);
  assert.equal(first.breached, 0);
  // One, not two. `met = total − breached` would make this 2 and the share
  // 100% — and it would read best on the day the desk opened.
  assert.equal(first.settled, 1);
  assert.equal(first.share, 1);
});

test('a missed deadline is counted from the row the sweep wrote, and the share is the two counts', async () => {
  const now = movable();
  const { raise, reply, sweep, share } = await start(now);

  const answered = await raise('Answered in time');
  await reply(answered);
  await raise('Nobody answered');

  // Normal priority promises a first response in eight hours (S-2).
  now.advanceHours(9);
  await sweep();

  const { kinds } = await (await share()).json();
  const first = kinds.first_response;

  assert.equal(first.met, 1);
  assert.equal(first.breached, 1);
  assert.equal(first.settled, 2);
  // Unrounded, and derivable from the two numbers beside it.
  assert.equal(first.share, 0.5);
});

test('a desk that missed everything says nought per cent, which is not the same as no data', async () => {
  const now = movable();
  const { raise, sweep, share } = await start(now);

  await raise('Nobody answered');
  now.advanceHours(9);
  await sweep();

  const { kinds } = await (await share()).json();

  assert.equal(kinds.first_response.settled, 1);
  assert.equal(kinds.first_response.share, 0);
  // And the other kind, in the same answer, has nothing to report — which is
  // why one number averaging the two would answer nobody's question.
  assert.equal(kinds.resolution.settled, 0);
  assert.equal(kinds.resolution.share, null);
});

test('a clock that stopped after it had already broken its promise is not a promise kept', async () => {
  const now = movable();
  const { raise, reply, sweep, share } = await start(now);

  const late = await raise('Answered, but late');
  now.advanceHours(9);
  await sweep();
  // The reply lands after the breach was recorded. The clock stops; the row
  // stays. Counting a stopped clock as met would call this a success.
  await reply(late);

  const { kinds } = await (await share()).json();

  assert.equal(kinds.first_response.met, 0);
  assert.equal(kinds.first_response.breached, 1);
  assert.equal(kinds.first_response.share, 0);
});

test('the two kinds are counted apart, because they are two different promises', async () => {
  const { admin, raise, reply, resolve, share } = await start();

  const done = await raise('Answered and fixed');
  await reply(done);
  // Re-read it: the reply moved the ticket from new to open, so the revision
  // it was raised with is no longer the one a status change may carry (BR-5).
  const moved = await (await admin(`/api/v1/tickets/${done.id}`)).json();
  await resolve(moved);

  await reply(await raise('Answered only'));

  const { kinds } = await (await share()).json();

  // Both tickets were answered; one was also resolved. The two promises are
  // different promises to the same person, and one number averaging them —
  // 3 met out of 3 — would say the desk resolved everything it answered.
  assert.equal(kinds.first_response.met, 2);
  assert.equal(kinds.first_response.settled, 2);
  assert.equal(kinds.resolution.met, 1);
  assert.equal(kinds.resolution.settled, 1);
});

test('a soft-deleted ticket is scored on nothing', async () => {
  const { db, raise, reply, share } = await start();

  const answered = await raise('Answered');
  await reply(answered);
  const alsoAnswered = await raise('Also answered');
  await reply(alsoAnswered);
  db.prepare('UPDATE tickets SET deleted_at = ? WHERE id = ?')
    .run('2026-09-02T00:00:00.000Z', answered.id);

  const { kinds } = await (await share()).json();

  // The desk is not scored on tickets that no longer exist — the same rule
  // that keeps queue-by-status agreeing with the queue (BR-1).
  assert.equal(kinds.first_response.met, 1);
  assert.equal(kinds.first_response.settled, 1);
});

test('reading the report writes nothing', async () => {
  const now = movable();
  const { db, raise, sweep, share } = await start(now);

  await raise('Nobody answered');
  now.advanceHours(9);
  await sweep();

  const before = db.prepare('SELECT count(*) AS n FROM sla_breaches').get().n;
  await share();
  await share();
  const after = db.prepare('SELECT count(*) AS n FROM sla_breaches').get().n;

  // A GET that quietly ran the sweep so its own number looked current would be
  // a read that writes, and the number would change under a reader who only
  // pressed refresh.
  assert.equal(before, 1);
  assert.equal(after, before);
});

test('an agent is refused, and the reader is never entered', async () => {
  const { admin, signIn, as } = await start();
  const made = await (await admin('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'promise-reader@support-desk.local', name: 'A Reader', role: 'agent' },
  })).json();
  const { token } = await (await signIn(made.user.email, made.initialPassword)).json();

  const res = await as(token)('/api/v1/reports/promise-share');

  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'FORBIDDEN');
});
