// Proves scripts/criteria/tickets.md section TICKETS-10-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'category-change-secret';
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
  const customerId = (await (await staff('/api/v1/customers?limit=1')).json()).items[0].id;
  const categories = (await (await staff('/api/v1/ticket-categories')).json()).items;

  const raise = async (categoryId = null) =>
    (await (await staff('/api/v1/tickets', {
      method: 'POST',
      body: { customerId, subject: 'Filed somewhere', body: 'Body.', categoryId },
    })).json());

  const refile = (id, body) => staff(`/api/v1/tickets/${id}/category`, { method: 'PATCH', body });
  const audit = () => db.prepare('SELECT * FROM audit_events ORDER BY rowid').all();
  const row = (id) => db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);

  return { db, staff, as, signIn, categories, raise, refile, audit, row };
}

test('a ticket is refiled, and the answer carries the new category and revision', async () => {
  const { categories, raise, refile, audit } = await start();
  const ticket = await raise(categories[0].id);
  const before = audit().length;

  const res = await refile(ticket.id, { categoryId: categories[1].id, revision: ticket.revision });
  assert.equal(res.status, 200);
  const updated = await res.json();

  assert.equal(updated.categoryId, categories[1].id);
  assert.equal(updated.revision, ticket.revision + 1);

  const row = audit().at(-1);
  assert.equal(row.verb, 'ticket.category');
  const diff = JSON.parse(row.diff);
  assert.equal(diff.before.categoryId, categories[0].id);
  assert.equal(diff.after.categoryId, categories[1].id);
  assert.equal(audit().length, before + 1);
});

test('null is a real value, in both directions', async () => {
  const { categories, raise, refile, row } = await start();

  const filed = await raise(categories[0].id);
  const cleared = await (await refile(filed.id, { categoryId: null, revision: filed.revision })).json();
  // The column allows it and a ticket may legitimately have no category.
  assert.equal(cleared.categoryId, null);
  assert.equal(row(filed.id).category_id, null);

  const back = await (await refile(filed.id, { categoryId: categories[0].id, revision: cleared.revision })).json();
  assert.equal(back.categoryId, categories[0].id);
});

test('a revision that is not the ticket’s is refused, and nothing changes', async () => {
  const { categories, raise, refile, row, audit } = await start();
  const ticket = await raise(categories[0].id);
  await refile(ticket.id, { categoryId: categories[1].id, revision: ticket.revision });
  const before = audit().length;

  // The revision the caller read is now stale — somebody changed the ticket
  // between their read and this write, which is exactly what BR-5 refuses.
  const res = await refile(ticket.id, { categoryId: null, revision: ticket.revision });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REVISION_MISMATCH');

  assert.equal(row(ticket.id).category_id, categories[1].id);
  assert.equal(audit().length, before);
});

test('a retired category cannot be filed into, and the field is named', async () => {
  const { db, categories, raise, refile, row, audit } = await start();
  const ticket = await raise(categories[0].id);
  db.prepare('UPDATE ticket_categories SET deleted_at = ? WHERE id = ?')
    .run('2026-01-01T00:00:00.000Z', categories[1].id);
  const before = audit().length;

  const res = await refile(ticket.id, { categoryId: categories[1].id, revision: ticket.revision });

  // Checked before the foreign key, which can see that a row exists and
  // cannot see that it was taken off the list. What may not be chosen for a
  // new ticket may not be chosen for an old one.
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['categoryId']);
  assert.equal(row(ticket.id).category_id, categories[0].id);
  assert.equal(audit().length, before);
});

test('a ticket already filed in a category that was later retired keeps it', async () => {
  const { db, categories, raise, refile, row } = await start();
  const ticket = await raise(categories[0].id);
  db.prepare('UPDATE ticket_categories SET deleted_at = ? WHERE id = ?')
    .run('2026-01-01T00:00:00.000Z', categories[0].id);

  // Retiring a category does not rewrite the tickets that carry it — that is
  // BR-1's whole point, and it is why this ticket can still be moved OUT.
  assert.equal(row(ticket.id).category_id, categories[0].id);
  const moved = await (await refile(ticket.id, { categoryId: null, revision: ticket.revision })).json();
  assert.equal(moved.categoryId, null);
});

test('a category nobody has is 422, not a foreign-key crash', async () => {
  const { categories, raise, refile } = await start();
  const ticket = await raise(categories[0].id);

  const res = await refile(ticket.id, { categoryId: 'no-such-category', revision: ticket.revision });

  // Letting the FK fire gives a raw SQLite error, which escapes as a 500 and
  // tells the caller their mistake was ours — CRM-82's lesson.
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['categoryId']);
});

test('a malformed request names its fields, and absent is not null', async () => {
  const { categories, raise, refile } = await start();
  const ticket = await raise(categories[0].id);

  const cases = [
    [{ revision: ticket.revision }, ['categoryId']],
    [{ categoryId: categories[0].id }, ['revision']],
    [{ categoryId: '', revision: ticket.revision }, ['categoryId']],
    [{ categoryId: 42, revision: ticket.revision }, ['categoryId']],
    [{ categoryId: categories[0].id, revision: 0 }, ['revision']],
    [{ categoryId: categories[0].id, revision: 'one' }, ['revision']],
    [{}, ['categoryId', 'revision']],
  ];
  for (const [body, fields] of cases) {
    const res = await refile(ticket.id, body);
    assert.equal(res.status, 422, JSON.stringify(body));
    assert.deepEqual((await res.json()).fields, fields, JSON.stringify(body));
  }
});

test('a customer is refused with the 404 every route under a ticket gives', async () => {
  const { staff, as, signIn, categories, raise } = await start();
  const customer = await (await staff('/api/v1/customers', {
    method: 'POST',
    body: { name: 'Aiko Tanaka', email: 'aiko@example.com' },
  })).json();
  const granted = await (await staff(`/api/v1/customers/${customer.id}/sign-in`, { method: 'POST' })).json();
  const theirs = as((await (await signIn('aiko@example.com', granted.initialPassword)).json()).token);

  const mine = await (await staff('/api/v1/tickets', {
    method: 'POST',
    body: { customerId: customer.id, subject: 'Theirs', body: 'Body.' },
  })).json();

  // Their own ticket, and still refused: a ticket's category is the desk's
  // filing, not the customer's.
  const res = await theirs(`/api/v1/tickets/${mine.id}/category`, {
    method: 'PATCH',
    body: { categoryId: categories[0].id, revision: mine.revision },
  });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, 'NOT_FOUND');
});

test('a ticket nobody has is 404', async () => {
  const { categories, refile } = await start();
  const res = await refile('no-such-ticket', { categoryId: categories[0].id, revision: 1 });
  assert.equal(res.status, 404);
});
