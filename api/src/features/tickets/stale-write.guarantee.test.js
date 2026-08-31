// BR-5 holds on EVERY path that writes to a ticket, not on the three somebody
// remembered.
//
// The fifth census of this shape, after audit, ownership, staff-only and
// note-leak. Like all of them it reads the routes off the router rather than
// from a list, because a list is the thing that goes stale: the next write
// added to this feature will be one nobody thought to add here.
//
// A rule enforced on three paths out of four protects nothing. The point of
// this file is the word EVERY.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { collectRoutes } from '../../platform/http/route-table.js';
import { API_V1_PREFIX } from '../../platform/http/prefix.js';

const SECRET = 'stale-write-census-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// Anything that writes, anywhere under a ticket. A matcher rather than a list.
const WRITES_A_TICKET = /^(POST|PATCH|PUT|DELETE) \/api\/v1\/(tickets|intake)\b/;

// The writes that carry no revision, and why. Each entry is an argument, not a
// dispensation — a route here has to be one where nobody read a value before
// writing, because that is the only thing BR-5 is about.
const NO_REVISION = new Map([
  [`POST ${API_V1_PREFIX}/tickets`,
   'creating a ticket: there is no earlier version of it to overwrite'],
  [`POST ${API_V1_PREFIX}/intake/:channel/tickets`,
   'the public intake creates one too, and the caller is a stranger with nothing to have read'],
  [`POST ${API_V1_PREFIX}/tickets/sweep-auto-close`,
   'T-6\'s sweep closes every resolved ticket whose fourteen days have passed. The caller read no ticket and '
   + 'named none — it asks the rule which are due — so there is no revision it could carry. It is not exempt from '
   + 'BR-5 in substance: it reads each ticket\'s revision and passes it to the same guarded writer, and a ticket '
   + 'that moved in between is skipped rather than overwritten'],
  [`POST ${API_V1_PREFIX}/tickets/:id/replies`,
   'a reply adds a message; it edits no field somebody read, so there is nothing for a revision to protect. '
   + 'What it CHANGES about the ticket — the first-response clock, the status, a reopen — is decided by the API '
   + 'from the reply itself, not from a value the caller sent'],
]);

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const app = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 });
  const server = app.listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const token = (await (await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })).json()).token;

  const call = (method, path, body) =>
    fetch(`${url}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
    });

  const customerId = (await (await call('GET', '/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async () =>
    (await (await call('POST', '/api/v1/tickets', {
      customerId, subject: 'Something is wrong', body: 'Body.',
    })).json());

  const audit = () => db.prepare('SELECT count(*) AS n FROM audit_events').get().n;
  return { db, app, call, raise, audit };
}

// The body each revision-carrying write needs, MINUS the revision. The census
// fills the revision in (or leaves it out) itself.
const bodyFor = {
  [`PATCH ${API_V1_PREFIX}/tickets/:id/assignee`]: () => ({ assigneeId: null }),
  [`PATCH ${API_V1_PREFIX}/tickets/:id/status`]: () => ({ status: 'open' }),
  [`PATCH ${API_V1_PREFIX}/tickets/:id/category`]: () => ({ categoryId: null }),
};

const guarded = (served) =>
  served.filter((entry) => WRITES_A_TICKET.test(entry) && !NO_REVISION.has(entry));

test('every route that writes to a ticket is accounted for', async () => {
  const { app } = await start();
  const served = collectRoutes(app, API_V1_PREFIX).filter((entry) => WRITES_A_TICKET.test(entry));
  assert.ok(served.length > 0, 'the app served no ticket writes — the census is reading nothing');

  // Every guarded route needs a body the census knows how to send. A route
  // that arrives without one fails here rather than being quietly skipped,
  // which is how a census stops covering the thing it is named after.
  const unaccounted = guarded(served).filter((entry) => !bodyFor[entry]);
  assert.deepEqual(
    unaccounted,
    [],
    `a ticket write this census cannot drive: ${unaccounted.join(', ')}\n`
      + 'Add its body to bodyFor, or name it in NO_REVISION with the reason nobody read a value first.',
  );

  // And the other direction: an exemption for a route that is no longer served
  // is an argument about nothing.
  const stale = [...NO_REVISION.keys()].filter((entry) => !served.includes(entry));
  assert.deepEqual(stale, [], `exempted route no longer served: ${stale.join(', ')}`);
});

test('every guarded write refuses a missing revision, naming the field', async () => {
  const { app, call, raise, audit } = await start();
  const served = collectRoutes(app, API_V1_PREFIX);
  const before = audit();

  for (const entry of guarded(served)) {
    const [method, path] = entry.split(' ');
    const ticket = await raise();
    const res = await call(method, path.replace(':id', ticket.id), bodyFor[entry]());

    // Not "no opinion". A caller that forgot the revision is a caller whose
    // read was stale and does not know it.
    assert.equal(res.status, 422, entry);
    assert.deepEqual((await res.json()).fields, ['revision'], entry);
  }

  // Raising the tickets wrote audit rows; the refused writes wrote none.
  assert.equal(audit(), before + guarded(served).length);
});

test('every guarded write refuses a revision that is not one', async () => {
  const { app, call, raise } = await start();
  const served = collectRoutes(app, API_V1_PREFIX);

  for (const entry of guarded(served)) {
    const [method, path] = entry.split(' ');
    for (const revision of ['one', 0, -1, 1.5, null, true]) {
      const ticket = await raise();
      const res = await call(method, path.replace(':id', ticket.id), {
        ...bodyFor[entry](),
        revision,
      });
      assert.equal(res.status, 422, `${entry} with revision=${JSON.stringify(revision)}`);
      assert.deepEqual((await res.json()).fields, ['revision'], entry);
    }
  }
});

test('every guarded write refuses a revision nobody issued', async () => {
  const { app, call, raise, audit } = await start();
  const served = collectRoutes(app, API_V1_PREFIX);
  const before = audit();

  for (const entry of guarded(served)) {
    const [method, path] = entry.split(' ');
    const ticket = await raise();
    const res = await call(method, path.replace(':id', ticket.id), {
      ...bodyFor[entry](),
      revision: ticket.revision + 99,
    });

    // 409 and not 422, deliberately. A revision from the future is
    // well-formed — it is a positive integer — and what is wrong with it is a
    // fact about this ticket, which only the row can answer. The caller's next
    // move is the same one a stale revision calls for: read it again. Saying
    // 422 would tell them to fix the shape of a request whose shape is fine.
    assert.equal(res.status, 409, entry);
    assert.equal((await res.json()).code, 'REVISION_MISMATCH', entry);
  }

  assert.equal(audit(), before + guarded(served).length, 'a refused write writes no audit row');
});

test('every guarded write answers with the ticket at its NEW revision', async () => {
  const { app, call, raise } = await start();
  const served = collectRoutes(app, API_V1_PREFIX);

  for (const entry of guarded(served)) {
    const [method, path] = entry.split(' ');
    const ticket = await raise();
    const answer = await (await call(method, path.replace(':id', ticket.id), {
      ...bodyFor[entry](),
      revision: ticket.revision,
    })).json();

    // So a screen can make a second change without re-reading. One that kept
    // the revision it loaded with refuses its own next write, and the bug
    // reads as a race that is not there.
    assert.equal(answer.revision, ticket.revision + 1, entry);
  }
});

// A second body per route, different from the first, so spending a revision
// twice is not also asking for a change that has already happened. The status
// route refuses THAT with its own code, and the overlap has its own test
// below rather than being hidden inside this one.
const secondBodyFor = {
  [`PATCH ${API_V1_PREFIX}/tickets/:id/assignee`]: () => ({ assigneeId: null }),
  [`PATCH ${API_V1_PREFIX}/tickets/:id/status`]: () => ({ status: 'pending' }),
  [`PATCH ${API_V1_PREFIX}/tickets/:id/category`]: () => ({ categoryId: null }),
};

test('the same revision cannot be spent twice', async () => {
  const { app, call, raise, db } = await start();
  const served = collectRoutes(app, API_V1_PREFIX);

  for (const entry of guarded(served)) {
    const [method, path] = entry.split(' ');
    const ticket = await raise();
    const at = path.replace(':id', ticket.id);

    assert.equal(
      (await call(method, at, { ...bodyFor[entry](), revision: ticket.revision })).status,
      200,
      entry,
    );

    // The second is somebody else's write arriving with a revision that was
    // current when they read it and is not any more — the whole situation BR-5
    // exists for. It asks for something DIFFERENT, so nothing but the stale
    // revision can be what refuses it.
    const again = await call(method, at, { ...secondBodyFor[entry](), revision: ticket.revision });
    assert.equal(again.status, 409, entry);
    assert.equal((await again.json()).code, 'REVISION_MISMATCH', entry);
    // And it overwrote nothing: the revision is still the one the first write
    // left, not bumped a second time.
    assert.equal(db.prepare('SELECT revision FROM tickets WHERE id = ?').get(ticket.id).revision,
      ticket.revision + 1, entry);
  }
});

test('a stale revision asking for a change that already happened says so instead', async () => {
  const { call, raise } = await start();
  const ticket = await raise();
  const at = `/api/v1/tickets/${ticket.id}/status`;

  await call('PATCH', at, { status: 'open', revision: ticket.revision });
  const again = await call('PATCH', at, { status: 'open', revision: ticket.revision });

  // Both refusals are true here: the revision is stale AND the ticket already
  // has that status. STATUS_UNCHANGED wins, and that is left as it is rather
  // than reordered, because it is the more useful of the two truths: whoever
  // asked wanted the ticket open, and it is open. A stale revision asking for
  // something that has NOT happened still gets REVISION_MISMATCH, which the
  // census above proves for every guarded route.
  //
  // Both are 409 and neither writes anything, so BR-5's promise — no silent
  // overwrite — holds either way. What differs is which truth the caller is
  // told, and that is a choice rather than an oversight.
  assert.equal(again.status, 409);
  assert.equal((await again.json()).code, 'STATUS_UNCHANGED');
});
