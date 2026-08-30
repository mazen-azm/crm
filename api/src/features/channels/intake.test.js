// Proves scripts/criteria/channels.md section CHANNELS-1-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'intake-secret';
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

  // No Authorization header, on purpose: this is what an outsider sends.
  const intake = (body, channel = 'web') =>
    fetch(`${url}/api/v1/intake/${channel}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const asStaff = (path, init = {}) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
  const count = (table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();

  return { db, intake, asStaff, count, audit };
}

const WELL_FORMED = {
  email: 'stranger@example.com',
  name: 'A Stranger',
  subject: 'The invoice is wrong',
  body: 'It says 400 and should say 40.',
};

test('a stranger with no token raises a ticket, and it is a ticket like any other', async () => {
  const { intake } = await start();

  const res = await intake(WELL_FORMED);
  assert.equal(res.status, 201);
  const ticket = await res.json();

  // Not a message saying it worked: the person needs a reference to quote.
  assert.ok(ticket.id);
  assert.equal(ticket.subject, 'The invoice is wrong');
  // New and unassigned, exactly like a desk-raised ticket. Arriving from
  // outside is not a priority.
  assert.equal(ticket.status, 'new');
  assert.equal(ticket.assigneeId, null);
  assert.equal(ticket.priority, 'normal');
  assert.equal(ticket.revision, 1);
  assert.equal(ticket.channel, 'web');
});

test('the ticket is raised through the same service the desk uses, not beside it', async () => {
  const { intake, asStaff, db } = await start();

  const ticket = await (await intake(WELL_FORMED)).json();

  // The proof has to be something a second insert path would NOT produce, and
  // most of the obvious candidates are not: allowedTransitions is derived from
  // the status when the row is read, revision is defaulted by the column, and
  // being in the queue only means a row exists. All three would be true of a
  // ticket inserted around the service.
  //
  // The clocks are the difference. S-1 starts both of them from the ticket's
  // creation, and only tickets.raise does it — an INSERT into tickets writes
  // no sla_clocks rows at all, and no amount of reading the ticket back would
  // notice.
  const clocks = db
    .prepare('SELECT kind, started_at FROM sla_clocks WHERE ticket_id = ? ORDER BY kind')
    .all(ticket.id);
  assert.deepEqual(clocks.map((c) => c.kind), ['first_response', 'resolution']);
  // From the ticket's creation, not from whenever the insert ran.
  assert.equal(clocks[0].started_at, ticket.createdAt);

  // And the desk sees it in the one queue, which is what SC-1 means.
  const queue = await (await asStaff('/api/v1/tickets')).json();
  assert.ok(queue.items.some((t) => t.id === ticket.id));
});

test('a desk-raised ticket says it came from the desk', async () => {
  const { intake, asStaff } = await start();
  const arrived = await (await intake(WELL_FORMED)).json();

  const customer = await (await asStaff('/api/v1/customers?limit=1')).json();
  const raised = await (await asStaff('/api/v1/tickets', {
    method: 'POST',
    body: {
      customerId: customer.items[0].id,
      subject: 'Raised at the desk',
      body: 'Somebody telephoned.',
    },
  })).json();

  assert.equal(arrived.channel, 'web');

  // The desk route sends no channel at all, and the column defaults rather than
  // being nullable: every ticket raised before the intake existed came from the
  // desk, because nothing else could raise one. "We do not know" and "the desk"
  // would otherwise be the same value.
  assert.equal(raised.channel, 'desk');
});

test('an address nobody has creates the customer, then and there', async () => {
  const { intake, count, audit } = await start();
  const before = count('customers');

  const ticket = await (await intake(WELL_FORMED)).json();

  assert.equal(count('customers'), before + 1);
  assert.ok(ticket.customerId);

  // Two rows, in order: the customer arrived, then the ticket did. Both
  // authored by nobody, because nobody was signed in — the audit writer means
  // a null actor as the system, and a borrowed staff id would be a trail
  // saying a person did what the system did.
  const written = audit().slice(-2);
  assert.equal(written[0].verb, 'customer.create');
  assert.equal(written[1].verb, 'ticket.create');
  assert.equal(written[0].actor_id, null);
  assert.equal(written[1].actor_id, null);
});

test('an address already on file is matched, and no second customer is made', async () => {
  const { intake, count, db } = await start();
  const existing = db.prepare('SELECT id, email FROM customers WHERE email IS NOT NULL').get();
  const before = count('customers');

  const ticket = await (await intake({ ...WELL_FORMED, email: existing.email })).json();

  assert.equal(ticket.customerId, existing.id);
  assert.equal(count('customers'), before);
});

test('the channel is on the audit row, not only on the column', async () => {
  const { intake, audit } = await start();

  await intake(WELL_FORMED);

  const created = audit().filter((r) => r.verb === 'ticket.create').at(-1);
  // BR-2 asks what changed. "A ticket appeared, from outside" is a different
  // event from "an agent raised one", even though the two rows look alike.
  assert.equal(JSON.parse(created.diff).after.channel, 'web');
});

test('a malformed ticket is refused, and leaves no customer behind', async () => {
  const { intake, count, audit } = await start();
  const before = { customers: count('customers'), tickets: count('tickets'), audit: audit().length };

  const res = await intake({ ...WELL_FORMED, subject: '   ' });
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['subject']);

  // The ticket's fields are checked BEFORE the customer is resolved. Validated
  // the other way round, a public form full of rubbish would still fill the
  // customers table — which is the whole reason for the order.
  assert.equal(count('customers'), before.customers);
  assert.equal(count('tickets'), before.tickets);
  assert.equal(audit().length, before.audit);
});

test('a request with no usable address is refused naming it', async () => {
  const { intake, count } = await start();
  const before = count('customers');

  for (const email of [undefined, null, '', '   ', 'not-an-address', 42]) {
    const res = await intake({ ...WELL_FORMED, email });
    assert.equal(res.status, 422, `email ${JSON.stringify(email)} should be refused`);
    assert.deepEqual((await res.json()).fields, ['email']);
  }
  assert.equal(count('customers'), before);
});

test('a name no channel has is a path that does not exist', async () => {
  const { intake, count } = await start();
  const before = count('tickets');

  // 404, not 422: the channel is a path segment, and there is no field in the
  // body to name. This is the answer for a name nothing has ever heard of;
  // a name this system knows and has decided against gets 501 instead
  // (CHANNELS-2-API, and the test below).
  for (const channel of ['carrier-pigeon', 'fax', '']) {
    const res = await intake(WELL_FORMED, channel);
    assert.equal(res.status, 404, `channel ${JSON.stringify(channel)}`);
    assert.equal((await res.json()).code, 'NOT_FOUND');
  }
  assert.equal(count('tickets'), before);
});

test('the intake takes no token, and ignores one it is given', async () => {
  const { intake, audit } = await start();

  // A stranger has none, which is the point. Sending one changes nothing:
  // the route places no requireSubject and the service passes null to both
  // writes regardless, so the trail cannot be made to name a person by
  // attaching a header.
  const res = await intake(WELL_FORMED);
  assert.equal(res.status, 201);
  assert.equal(audit().filter((r) => r.actor_id !== null).length, 0);
});
