// Proves scripts/criteria/audit.md section AUDIT-1-API through the app itself:
// every mutating route the router serves writes exactly one audit row, a failed
// mutation leaves neither the change nor the row, and no diff carries a secret.
//
// The set of routes checked is DERIVED FROM THE ROUTER, not listed here (L-24).
// A hand-written list would rest on the memory of the next author — the same
// memory that would have forgotten the audit call in the first place.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { collectRoutes } from '../../platform/http/route-table.js';
import { API_V1_PREFIX } from '../../platform/http/prefix.js';
import { wrapDbWithAuditGuard } from './audit.guard.js';

const SECRET = 'audit-guarantee-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// Routes that change nothing. Everything else must be exercised below.
const READ_ONLY = new Set(['GET', 'HEAD', 'OPTIONS']);

// Mutating routes that deliberately write no audit row, each with the reason.
// A route may only be here on purpose — an entry is a decision, not a waiver.
const NOT_A_MUTATION = new Map([
  ['POST /api/v1/sign-in', 'signing in changes nothing; the throttle counters are in memory'],
]);

async function start() {
  const real = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(real);
  // The guard goes on AFTER the seed: seeding is a mutation with no actor and
  // no request, and it runs outside any transaction, where the guard is inert.
  const db = wrapDbWithAuditGuard(real);
  const app = composeApp({ db, secret: SECRET });
  const server = app.listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  // A holder rather than a value: changing the admin's own password below ends
  // every session issued before it, this one included, and the census adopts
  // the token that answer carries. `call` reads through the holder so the
  // steps that follow use the live one.
  const session = { token: (await res.json()).token };

  const call = (path, { method = 'GET', body, tok = session.token } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const auditCount = () => real.prepare('SELECT count(*) AS n FROM audit_events').get().n;
  return { app, real, call, auditCount, adminPassword, session };
}

// Every mutating route this file drives. Compared against the router below.
const EXERCISED = new Set([
  'POST /api/v1/accounts',
  'PATCH /api/v1/accounts/:id/role',
  'POST /api/v1/accounts/:id/disable',
  'POST /api/v1/accounts/:id/re-enable',
  'POST /api/v1/accounts/:id/set-password',
  'POST /api/v1/me/password',
  'POST /api/v1/customers',
  'PATCH /api/v1/customers/:id',
  'DELETE /api/v1/customers/:id',
  'POST /api/v1/customers/:id/notes',
  'POST /api/v1/customers/:id/sign-in',
  'POST /api/v1/tickets',
  'PATCH /api/v1/tickets/:id/assignee',
  'PATCH /api/v1/tickets/:id/status',
  'PATCH /api/v1/tickets/:id/category',
  'POST /api/v1/ticket-categories',
  'PATCH /api/v1/ticket-categories/:id',
  'DELETE /api/v1/ticket-categories/:id',
  'POST /api/v1/tickets/:id/replies',
  'POST /api/v1/me/notifications/:id/read',
  'POST /api/v1/tickets/sweep-auto-close',
  'POST /api/v1/tickets/sweep-breaches',
  'POST /api/v1/intake/:channel/tickets',
]);

test('every mutating route the router serves is exercised by this file', async () => {
  const { app } = await start();
  const mutating = collectRoutes(app, API_V1_PREFIX)
    .filter((entry) => !READ_ONLY.has(entry.split(' ')[0]))
    .filter((entry) => !NOT_A_MUTATION.has(entry));

  const uncovered = mutating.filter((entry) => !EXERCISED.has(entry));
  const stale = [...EXERCISED].filter((entry) => !mutating.includes(entry));

  assert.deepEqual(
    uncovered,
    [],
    `mutating route not exercised by the audit guarantee: ${uncovered.join(', ')}\n` +
      'Add it below and assert its audit row, or record it in NOT_A_MUTATION with a reason.',
  );
  assert.deepEqual(stale, [], `exercised route no longer served: ${stale.join(', ')}`);
});

test('each mutating route writes exactly one audit row', async () => {
  const { call, auditCount, adminPassword, session, real } = await start();

  const steps = [
    ['POST /api/v1/accounts', () =>
      call('/api/v1/accounts', {
        method: 'POST',
        body: { email: 'audited@support-desk.local', name: 'Audited', role: 'agent' },
      })],
  ];

  let created;
  for (const [name, run] of steps) {
    const before = auditCount();
    const res = await run();
    assert.ok(res.ok, `${name} should succeed, got ${res.status}`);
    created = (await res.json()).user;
    assert.equal(auditCount(), before + 1, `${name} must write exactly one audit row`);
  }

  // Adding a route to EXERCISED without driving it here would satisfy the
  // census with a claim rather than a test — which is the failure the census
  // exists to prevent, arriving through its own front door.
  const customer = (await (await call('/api/v1/customers?limit=1')).json()).items[0];
  // Made here rather than found: the grant needs a customer WITH an email
  // address, because the address is what they would sign in with, and what the
  // seed happens to contain is not this test's contract. Raised outside the
  // counted steps below, like the tickets above it — creating it writes an
  // audit row of its own.
  const withEmail = await (await call('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Granted A Sign In', email: 'granted@support-desk.local' },
  })).json();

  // A customer of its own to delete. The seeded one the steps above act on
  // cannot be the one deleted here: whichever order the steps run in, a
  // deleted customer answers 404 to the note and the correction beside it.
  const toDelete = await (await call('/api/v1/customers', {
    method: 'POST',
    body: { name: 'To Be Deleted', email: 'deleted@support-desk.local' },
  })).json();

  // Who the census is signed in as, so a notification can be written FOR them.
  // One is needed because the read route below marks their own, and nothing
  // the census does would produce one: a notification is written when somebody
  // ELSE assigns you a ticket, and the census acts as one person throughout.
  const me = await (await call('/api/v1/me')).json();

  // Raised outside the counted steps below: each of those asserts exactly one
  // new audit row, and raising a ticket writes one of its own. Driven for real
  // rather than only listed — a route named in the covered set without being
  // exercised satisfies the census with a claim, which is the failure the
  // census exists to prevent.
  const assignable = await (await call('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'To be assigned', body: 'Body.' },
  })).json();

  // A second ticket, for the same reason: the status move needs a ticket whose
  // revision nothing else has touched.
  const movable = await (await call('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'To be moved', body: 'Body.' },
  })).json();

  // A ticket that has already been replied to once, so the route below writes
  // one row rather than the two a first reply writes. Driven for real rather
  // than only listed.
  const replied = await (await call('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'To be replied to', body: 'Body.' },
  })).json();
  await call(`/api/v1/tickets/${replied.id}/replies`, {
    method: 'POST',
    body: { body: 'The first reply, which opens it and stops the clock.' },
  });

  // Its own ticket, because changing a category bumps the revision and every
  // other step here holds one it read.
  const categorised = await (await call('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'To be refiled', body: 'Body.' },
  })).json();

  // A category of its own to rename and retire, so the two steps below do not
  // depend on the order of anything else. Made outside the counted steps: its
  // creation writes an audit row.
  const spare = await (await call('/api/v1/ticket-categories', {
    method: 'POST',
    body: { name: 'To Be Renamed And Retired' },
  })).json();

  const rest = [
    ['POST /api/v1/tickets', () =>
      call('/api/v1/tickets', {
        method: 'POST',
        body: { customerId: customer.id, subject: 'A raised ticket', body: 'So this route is driven.' },
      })],
    ['PATCH /api/v1/tickets/:id/assignee', () =>
      call(`/api/v1/tickets/${assignable.id}/assignee`, {
        method: 'PATCH',
        body: { assigneeId: null, revision: assignable.revision },
      })],
    // A SECOND reply, so it writes one audit row. The first reply on a `new`
    // ticket writes two — the reply and the status move T-2 requires — and
    // that pair is pinned in the conversation feature's own tests, where the
    // count is the thing being tested rather than the frame around it. The
    // first one is posted outside the counted steps, above.
    ['POST /api/v1/tickets/:id/replies', () =>
      call(`/api/v1/tickets/${replied.id}/replies`, {
        method: 'POST',
        body: { body: 'A second reply, so this route is driven.' },
      })],
    ['POST /api/v1/ticket-categories', () =>
      call('/api/v1/ticket-categories', { method: 'POST', body: { name: 'Audited By The Census' } })],
    ['PATCH /api/v1/ticket-categories/:id', () =>
      call(`/api/v1/ticket-categories/${spare.id}`, { method: 'PATCH', body: { name: 'Renamed By The Census' } })],
    ['DELETE /api/v1/ticket-categories/:id', () =>
      call(`/api/v1/ticket-categories/${spare.id}`, { method: 'DELETE' })],
    ['PATCH /api/v1/tickets/:id/category', () =>
      call(`/api/v1/tickets/${categorised.id}/category`, {
        method: 'PATCH',
        body: { categoryId: null, revision: categorised.revision },
      })],
    ['PATCH /api/v1/tickets/:id/status', () =>
      call(`/api/v1/tickets/${movable.id}/status`, {
        method: 'PATCH',
        body: { status: 'open', revision: movable.revision },
      })],
    ['POST /api/v1/customers', () =>
      call('/api/v1/customers', {
        method: 'POST',
        body: { name: 'Audited By The Census', email: 'census@support-desk.local' },
      })],
    // Driven with an address ALREADY on file, on purpose. The intake writes two
    // audit rows for a stranger — the customer it created and the ticket it
    // raised — and one for somebody it recognised. This loop asserts exactly
    // one per route, so the recognised case is the one that belongs in it; the
    // two-row case is pinned in the channels feature's own tests, where the
    // count is the thing being tested rather than the frame around it.
    // Written straight into the table: the route that creates one is an
    // assignment BY SOMEBODY ELSE, and this census is one person. The route
    // being driven here is the read.
    ['POST /api/v1/me/notifications/:id/read', () => {
      real.prepare(`
        INSERT INTO notifications (id, user_id, ticket_id, kind, created_at)
        VALUES ('census-notification', ?, ?, 'ticket.assigned', '2026-08-31T00:00:00.000Z')
      `).run(me.id, replied.id);
      return call('/api/v1/me/notifications/census-notification/read', { method: 'POST' });
    }],
    // The sweep, with one ticket due. Its audit row carries no actor — the
    // admin chose when it ran, not which tickets were due — and the census
    // counts rows rather than reading actors, so it belongs here like any
    // other mutation.
    ['POST /api/v1/tickets/sweep-auto-close', () => {
      real.prepare(`
        UPDATE tickets SET status = 'resolved', resolved_at = '2020-01-01T00:00:00.000Z'
         WHERE id = ?
      `).run(replied.id);
      return call('/api/v1/tickets/sweep-auto-close', { method: 'POST' });
    }],
    // One ticket whose RESOLUTION promise has fallen due, so the sweep does
    // everything S-6 asks: four rows, and the number is stated rather than
    // the assertion relaxed.
    //
    //   sla.breach          the fact, attributed to nobody
    //   ticket.priority     raised one level, attributed to nobody
    //   notification.create one per admin — the seed rosters two
    //
    // Four, because the seed has two admins. If the seed's roster changes this number
    // changes with it, and that is the census noticing rather than a
    // brittleness — a rule that tells every admin should fail loudly when
    // nobody notices it stopped.
    ['POST /api/v1/tickets/sweep-breaches', () => {
      real.prepare(`
        UPDATE sla_clocks SET started_at = '2020-01-01T00:00:00.000Z', stopped_at = NULL
         WHERE ticket_id = ? AND kind = 'resolution'
      `).run(replied.id);
      return call('/api/v1/tickets/sweep-breaches', { method: 'POST' });
    }, 4],
    ['POST /api/v1/intake/:channel/tickets', () =>
      call('/api/v1/intake/web/tickets', {
        method: 'POST',
        body: {
          email: customer.email,
          subject: 'Arrived through the intake',
          body: 'So this route is driven.',
        },
      })],
    // A customer WITH an email address: the address is what they would sign in
    // with, so one without it is refused naming the field. The first seeded
    // customer is the walk-in counter and has none.
    ['POST /api/v1/customers/:id/sign-in', () =>
      call(`/api/v1/customers/${withEmail.id}/sign-in`, { method: 'POST' }), 2],
    ['PATCH /api/v1/customers/:id', () =>
      call(`/api/v1/customers/${customer.id}`, {
        method: 'PATCH',
        body: { phone: '+20 2 5555 0199' },
      })],
    ['DELETE /api/v1/customers/:id', () =>
      call(`/api/v1/customers/${toDelete.id}`, { method: 'DELETE' })],
    ['POST /api/v1/customers/:id/notes', () =>
      call(`/api/v1/customers/${customer.id}/notes`, {
        method: 'POST',
        body: { body: 'A note, so this route is actually exercised.' },
      })],
    ['PATCH /api/v1/accounts/:id/role', () =>
      call(`/api/v1/accounts/${created.id}/role`, { method: 'PATCH', body: { role: 'admin' } })],
    ['POST /api/v1/accounts/:id/disable', () =>
      call(`/api/v1/accounts/${created.id}/disable`, { method: 'POST' })],
    ['POST /api/v1/accounts/:id/re-enable', () =>
      call(`/api/v1/accounts/${created.id}/re-enable`, { method: 'POST' })],
    // The admin's own, through the route that asks for the current one. It
    // changes the credential this whole file signed in with, and IDENTITY-8-API
    // has now shipped — so every token issued before this second, including the
    // one this census is holding, stops being accepted.
    //
    // The comment that stood here predicted exactly that: "when it does, this
    // line is where that shows up." It did, as a 401 on the very next step.
    //
    // So the census does what any client must now do: it takes the token the
    // answer carries and keeps going. That is not a workaround — it is the
    // contract, and a census that special-cased its way past it would be
    // hiding the thing the story added.
    ['POST /api/v1/me/password', async () => {
      const res = await call('/api/v1/me/password', {
        method: 'POST',
        body: { currentPassword: adminPassword, newPassword: 'a-new-admin-password' },
      });
      if (res.ok) session.token = (await res.clone().json()).token;
      return res;
    }],
    // Somebody else's account: an admin may not set their own password here.
    ['POST /api/v1/accounts/:id/set-password', () =>
      call(`/api/v1/accounts/${created.id}/set-password`, {
        method: 'POST',
        body: { password: 'a-long-enough-password' },
      })],
  ];

  // Most routes write one row. Granting a customer a sign-in writes two — the
  // user account and the link on the customer — and that is not a defect to
  // paper over: they are two things that happened, in one transaction, and a
  // trail that recorded only one of them would answer "who created this user"
  // with silence. The count is stated per route so the exception is a number
  // somebody chose rather than an assertion quietly relaxed for everybody.
  for (const [name, run, expected = 1] of rest) {
    const before = auditCount();
    const res = await run();
    assert.ok(res.ok, `${name} should succeed, got ${res.status}`);
    assert.equal(
      auditCount(),
      before + expected,
      `${name} must write exactly ${expected} audit row(s)`,
    );
  }
});

test('a refused mutation leaves neither the change nor a row', async () => {
  const { call, real, auditCount } = await start();

  const created = await (await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'refused@support-desk.local', name: 'Refused', role: 'agent' },
  })).json();
  const before = auditCount();

  // An unknown id, and a role the enum does not contain. Both are refusals,
  // and a refusal that wrote an audit row would be a trail recording things
  // that never happened.
  const missing = await call('/api/v1/accounts/no-such-id/disable', { method: 'POST' });
  assert.equal(missing.status, 404);

  const badRole = await call(`/api/v1/accounts/${created.user.id}/role`, {
    method: 'PATCH',
    body: { role: 'wizard' },
  });
  assert.equal(badRole.status, 422);

  assert.equal(auditCount(), before, 'a refusal writes no audit row');
  assert.equal(
    real.prepare('SELECT role FROM users WHERE id = ?').get(created.user.id).role,
    'agent',
    'and changes nothing',
  );
});

test('an unaudited mutation cannot reach the database through the app either', async () => {
  const { real } = await start();
  const db = wrapDbWithAuditGuard(real);
  const before = real.prepare('SELECT count(*) AS n FROM users').get().n;

  // What a future route that forgot its audit call would do. The guard refuses
  // the commit, so the change never lands — this is the acceptance criterion
  // 'a new mutating route added later that does not write an audit row' with
  // the route standing in for the author who forgot.
  db.exec('BEGIN');
  db.prepare('UPDATE users SET name = ? WHERE 1=1').run('renamed by nobody');
  assert.throws(() => db.exec('COMMIT'), /AUDIT_GUARD: mutation of users/);
  real.exec('ROLLBACK');

  assert.equal(real.prepare('SELECT count(*) AS n FROM users').get().n, before);
  assert.equal(
    real.prepare("SELECT count(*) AS n FROM users WHERE name = 'renamed by nobody'").get().n,
    0,
  );
});

test('a mutation with nobody signed in records the actor as absent, not invented', async () => {
  const { real } = await start();
  const { createAuditWriter } = await import('./audit.service.js');
  createAuditWriter({ db: real }).record(null, {
    entity: 'user',
    entityId: 'u-sys',
    verb: 'user.create',
    before: null,
    after: { role: 'agent' },
    at: '2026-08-28T00:00:00.000Z',
  });

  const row = real.prepare('SELECT actor_id FROM audit_events ORDER BY rowid DESC LIMIT 1').get();
  assert.equal(row.actor_id, null);
});

test('no audit row carries a password, a hash or a token', async () => {
  const { call, real, auditCount } = await start();
  const res = await call('/api/v1/accounts', {
    method: 'POST',
    body: { email: 'quiet@support-desk.local', name: 'Quiet', role: 'agent' },
  });
  const { user, initialPassword } = await res.json();
  await call(`/api/v1/accounts/${user.id}/role`, { method: 'PATCH', body: { role: 'admin' } });
  assert.ok(auditCount() > 0);

  // rowid, never at: two rows written in the same second have equal timestamps
  // and the engine orders them as it pleases (L-19).
  const rows = real.prepare('SELECT diff FROM audit_events ORDER BY rowid ASC').all();

  // Walk the keys rather than scanning the text: a person legitimately named
  // "Secretive" would trip a substring search, and a check that cries wolf gets
  // relaxed until it catches nothing.
  const keysOf = (value, out = []) => {
    if (value === null || typeof value !== 'object') return out;
    for (const [k, v] of Object.entries(value)) {
      out.push(k.toLowerCase());
      keysOf(v, out);
    }
    return out;
  };

  for (const { diff } of rows) {
    for (const key of keysOf(JSON.parse(diff))) {
      for (const forbidden of ['password', 'token', 'secret', 'hash']) {
        assert.ok(!key.includes(forbidden), `a diff must carry no ${forbidden} field: ${diff}`);
      }
    }
    assert.ok(!diff.includes(initialPassword), 'and never the value itself');
  }
});
