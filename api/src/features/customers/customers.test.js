// Proves scripts/criteria/customers.md section CUSTOMERS-1-API: one search
// across name, address and number, paginated by the ceiling every list obeys,
// with a deleted customer never returned and a miss answered as an empty page.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';

const SECRET = 'customers-test-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signInAs = async (email, password) => {
    const res = await fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return (await res.json()).token;
  };

  const token = await signInAs(adminEmail, adminPassword);
  const search = (query = '', { tok = token } = {}) =>
    fetch(`${url}/api/v1/customers${query}`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });

  return { db, url, search, signInAs, token };
}

const namesIn = async (res) => (await res.json()).items.map((c) => c.name);

test('one term finds a customer by name', async () => {
  const { search } = await start();
  const res = await search('?q=Leila');
  assert.equal(res.status, 200);
  assert.deepEqual(await namesIn(res), ['Leila Mansour']);
});

test('the same term finds by email address, whatever its case', async () => {
  const { search } = await start();
  // The seed stores this one capitalised; the column is COLLATE NOCASE.
  assert.deepEqual(await namesIn(await search('?q=marcus.bell@example.com')), ['Marcus Bell']);
});

test('a phone number is found however either side punctuated it', async () => {
  const { search } = await start();
  // Stored '+20 2 5555 0177'. Nobody types it that way.
  assert.deepEqual(await namesIn(await search('?q=20255550177')), ['Leila Mansour']);
  assert.deepEqual(await namesIn(await search('?q=+20 2 5555 0177')), ['Leila Mansour']);
});

test('a term that matches nothing is an empty page, not a 404', async () => {
  const { search } = await start();
  const res = await search('?q=nobody-by-that-name');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.items, []);
  assert.equal(body.total, 0);
});

test('no term at all lists the customers', async () => {
  const { search } = await start();
  const body = await (await search()).json();
  assert.equal(body.total, 7, 'the seed ships seven customers');
  assert.equal(body.items.length, 7);
});

test('a deleted customer is not found, by any leg', async () => {
  const { db, search } = await start();
  db.prepare("UPDATE customers SET deleted_at = '2026-08-29' WHERE name = ?").run('Leila Mansour');

  assert.deepEqual(await namesIn(await search('?q=Leila')), []);
  assert.deepEqual(await namesIn(await search('?q=leila.mansour@example.com')), []);
  assert.deepEqual(await namesIn(await search('?q=20255550177')), []);
  assert.equal((await (await search()).json()).total, 6);
});

test('the row carries no address and nothing deleted', async () => {
  const { search } = await start();
  const [row] = (await (await search('?q=Leila')).json()).items;
  assert.deepEqual(Object.keys(row).sort(), ['createdAt', 'email', 'id', 'name', 'phone', 'updatedAt']);
});

test('total counts the matches, not the page', async () => {
  const { search } = await start();
  const body = await (await search('?q=example.com&limit=2')).json();
  assert.equal(body.items.length, 2);
  // Six of the seven have an example.com address; the walk-in counter has none.
  assert.equal(body.total, 6);
  assert.equal(body.limit, 2);
});

test('the page ceiling refuses, it does not clamp (BR-4)', async () => {
  const { search } = await start();
  const res = await search('?limit=500');
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['limit']);
});

test('no token is 401', async () => {
  const { search } = await start();
  assert.equal((await search('', { tok: null })).status, 401);
});

test('an agent may search — this is not admin-only', async () => {
  const { url, token, search, signInAs } = await start();
  const created = await fetch(`${url}/api/v1/accounts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'searcher@support-desk.local', name: 'Searcher', role: 'agent' }),
  });
  const { user, initialPassword } = await created.json();
  assert.ok(user);
  const agentToken = await signInAs('searcher@support-desk.local', initialPassword);

  assert.equal((await search('?q=Leila', { tok: agentToken })).status, 200);
});

test('a search writes no audit row', async () => {
  const { db, search } = await start();
  const before = db.prepare('SELECT count(*) AS n FROM audit_events').get().n;
  await search('?q=Leila');
  await search();
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, before);
});

test('a percent sign a person typed is a character, not a wildcard', async () => {
  const { search } = await start();
  // If the term were interpolated, '%' would match everybody.
  assert.deepEqual(await namesIn(await search('?q=%25')), []);
});
