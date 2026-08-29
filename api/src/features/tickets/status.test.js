// Proves scripts/criteria/tickets.md section TICKETS-4-API — the status
// machine, and T-7's requirement that a refusal name what would have worked.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { STATUSES, TRANSITIONS, allowedFrom } from './tickets.rules.js';

const SECRET = 'status-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const token = (await (await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })).json()).token;

  const call = (path, { method = 'GET', body, tok = token } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const customerId = (await (await call('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async () =>
    (await (await call('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Status', body: 'Body.' },
    })).json());

  const move = (id, body, tok = token) =>
    call(`/api/v1/tickets/${id}/status`, { method: 'PATCH', body, tok });

  // Walk the ticket to `target` along legal edges only, so a test about one
  // edge never depends on an illegal shortcut to set itself up.
  const PATH = {
    new: [],
    open: ['open'],
    pending: ['pending'],
    resolved: ['resolved'],
    closed: ['resolved', 'closed'],
    reopened: ['resolved', 'reopened'],
  };
  const at = async (status) => {
    let ticket = await raise();
    for (const step of PATH[status]) {
      const res = await move(ticket.id, { status: step, revision: ticket.revision });
      assert.equal(res.status, 200, `setup ${ticket.status} -> ${step}`);
      ticket = await res.json();
    }
    assert.equal(ticket.status, status);
    return ticket;
  };

  const row = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const auditCount = () => db.prepare('SELECT count(*) AS n FROM audit_events').get().n;
  const lastAudit = () =>
    db.prepare('SELECT * FROM audit_events ORDER BY rowid DESC LIMIT 1').get();

  return { db, call, raise, move, at, row, auditCount, lastAudit };
}

test('new to resolved is legal — a request answered on the spot is closeable', async () => {
  const { at, move } = await start();
  const ticket = await at('new');

  const res = await move(ticket.id, { status: 'resolved', revision: ticket.revision });
  assert.equal(res.status, 200);
  const after = await res.json();
  assert.equal(after.status, 'resolved');
  assert.equal(after.revision, ticket.revision + 1);
});

test('every edge the table calls legal is accepted', async () => {
  const { at, move } = await start();
  for (const [from, targets] of Object.entries(TRANSITIONS)) {
    for (const to of targets) {
      const ticket = await at(from);
      const res = await move(ticket.id, { status: to, revision: ticket.revision });
      assert.equal(res.status, 200, `${from} -> ${to} should be legal`);
      const body = await res.json();
      assert.equal(body.status, to);
      assert.equal(body.revision, ticket.revision + 1);
    }
  }
});

test('every edge the table omits is refused, and the refusal names the legal ones', async () => {
  const { at, move } = await start();
  for (const from of STATUSES) {
    const legal = allowedFrom(from);
    for (const to of STATUSES.filter((s) => s !== from && !legal.includes(s))) {
      const ticket = await at(from);
      const res = await move(ticket.id, { status: to, revision: ticket.revision });
      assert.equal(res.status, 409, `${from} -> ${to} should be refused`);
      const body = await res.json();
      assert.equal(body.code, 'ILLEGAL_TRANSITION');
      // From where the ticket IS, not from where the caller wanted it.
      assert.deepEqual(body.allowed, [...legal]);
    }
  }
});

test('a closed ticket answers "nothing would have worked" rather than saying nothing', async () => {
  const { at, move } = await start();
  const ticket = await at('closed');

  const res = await move(ticket.id, { status: 'open', revision: ticket.revision });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, 'ILLEGAL_TRANSITION');
  // The key is PRESENT and empty. Absent would be indistinguishable from a
  // stale revision, which is a different failure with a different fix.
  assert.ok(Object.hasOwn(body, 'allowed'), 'allowed must be present');
  assert.deepEqual(body.allowed, []);
});

test('asking for the status a ticket already has writes nothing at all', async () => {
  const { at, move, row, auditCount } = await start();
  const ticket = await at('open');
  const before = row(ticket.id);
  const audits = auditCount();

  const res = await move(ticket.id, { status: 'open', revision: ticket.revision });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, 'STATUS_UNCHANGED');
  assert.deepEqual(body.allowed, [...allowedFrom('open')]);

  const after = row(ticket.id);
  assert.equal(after.revision, before.revision);
  assert.equal(after.updated_at, before.updated_at);
  assert.equal(auditCount(), audits, 'a refusal must not leave an audit row');
});

test('a stale revision on a legal move is refused, and carries no allowed key', async () => {
  const { at, move, row } = await start();
  const ticket = await at('new');
  const stale = ticket.revision;

  assert.equal((await move(ticket.id, { status: 'open', revision: stale })).status, 200);
  const settled = row(ticket.id);

  const res = await move(ticket.id, { status: 'pending', revision: stale });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, 'REVISION_MISMATCH');
  assert.equal(Object.hasOwn(body, 'allowed'), false);

  const after = row(ticket.id);
  assert.equal(after.revision, settled.revision);
  assert.equal(after.status, settled.status);
});

test('a successful move is audited with the status on both sides', async () => {
  const { at, move, auditCount, lastAudit } = await start();
  const ticket = await at('new');
  const before = auditCount();

  assert.equal((await move(ticket.id, { status: 'open', revision: ticket.revision })).status, 200);
  assert.equal(auditCount(), before + 1, 'exactly one row per move');

  const row = lastAudit();
  assert.equal(row.verb, 'ticket.status');
  assert.equal(row.entity, 'ticket');
  assert.equal(row.entity_id, ticket.id);
  // before and after are one JSON `diff` column — SQLite has no JSONB, so the
  // shape is serialised in application code (0004__audit_events.sql:8).
  assert.deepEqual(JSON.parse(row.diff), {
    before: { status: 'new' },
    after: { status: 'open' },
  });
});

test('a status outside the six, and a missing revision, are named as fields', async () => {
  const { at, move } = await start();
  const ticket = await at('new');

  const bad = await move(ticket.id, { status: 'done', revision: ticket.revision });
  assert.equal(bad.status, 422);
  assert.deepEqual((await bad.json()).fields, ['status']);

  const noRev = await move(ticket.id, { status: 'open' });
  assert.equal(noRev.status, 422);
  assert.deepEqual((await noRev.json()).fields, ['revision']);
});

test('a ticket that is not there is 404, not a refusal about statuses', async () => {
  const { move } = await start();
  const res = await move('00000000-0000-4000-8000-000000000000', {
    status: 'open',
    revision: 1,
  });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, 'NOT_FOUND');
});

test('signing in is required', async () => {
  const { at, move } = await start();
  const ticket = await at('new');
  const res = await move(ticket.id, { status: 'open', revision: ticket.revision }, null);
  assert.equal(res.status, 401);
});
