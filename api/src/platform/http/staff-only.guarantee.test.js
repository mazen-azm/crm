// Every route this API serves either refuses a customer, or is named below
// with the reason it does not.
//
// This exists because CUSTOMERS-6-API changed what an old sentence meant.
// Until a customer could hold a token, "is signed in" and "is staff" were the
// same thing, and seventeen routes were written with requireSubject() meaning
// the second. The day the first customer signed in, every one of them — the
// customer list, any customer's screen and their notes, the queue, raising a
// ticket, the staff list — became reachable by anybody with a customer
// account. Nothing about those routes had changed; a word they leaned on had.
//
// So the set is READ OFF THE ROUTER, the way audit.guarantee.test.js and
// ticket-ownership.guarantee.test.js read theirs. A route added next year
// either refuses a customer or fails here, and nobody has to remember why.
//
// The same warning both of those carry applies: naming a route in the list
// below without a reason somebody would defend satisfies the census with a
// claim, which is the failure a census exists to prevent arriving through its
// own front door.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../db/connection.js';
import { seed } from '../db/seed.js';
import { collectRoutes } from './route-table.js';
import { API_V1_PREFIX } from './prefix.js';

const SECRET = 'staff-only-census-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// Routes a customer may reach, each with the reason. An entry here is a
// decision, not a waiver.
const OPEN_TO_A_CUSTOMER = new Map([
  [`POST ${API_V1_PREFIX}/sign-in`, 'a customer signs in with the account CUSTOMERS-6-API granted them'],
  [`GET ${API_V1_PREFIX}/me`, 'who you are is yours to read, whoever you are'],
  [`POST ${API_V1_PREFIX}/me/password`, 'your own password is yours to change, whoever you are — one route for every role'],
  [`GET ${API_V1_PREFIX}/me/tickets`, 'a customer\'s own tickets; staff have the queue and this refuses them'],
  [`POST ${API_V1_PREFIX}/intake/:channel/tickets`, 'the public intake takes no token at all — a stranger is the caller'],
  [`GET ${API_V1_PREFIX}/openapi.json`, 'the document describes the API to anybody'],
  [`GET ${API_V1_PREFIX}/health`, 'a liveness check, and it says nothing about anybody'],
  // The three under /tickets/:id are reachable ON PURPOSE, so the service can
  // answer in one shape for "not yours" and "not there". A 403 at the door
  // would be a second, different answer to the same question, and
  // ticket-ownership.guarantee.test.js is what holds them to it.
  [`GET ${API_V1_PREFIX}/tickets/:id/history`, 'a customer reads their own ticket, and anybody else\'s is the same 404 a missing one gets'],
  [`PATCH ${API_V1_PREFIX}/tickets/:id/assignee`, 'reachable so the refusal is the ownership 404 rather than a 403 that tells the two apart'],
  [`PATCH ${API_V1_PREFIX}/tickets/:id/status`, 'the same'],
  [`POST ${API_V1_PREFIX}/tickets/:id/replies`, 'the same — reachable so the refusal is the ownership 404, and CONVERSATION-3-API turns it into a comparison'],
]);

async function start() {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const app = composeApp({ db, secret: SECRET, now: () => 1_800_000_000 });
  const server = app.listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const signIn = (email, password) =>
    fetch(`${url}/api/v1/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const staffToken = (await (await signIn(adminEmail, adminPassword)).json()).token;
  const call = (tok) => (method, path) =>
    fetch(`${url}${path}`, {
      method,
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      ...(method === 'GET' || method === 'HEAD' ? {} : { body: '{}' }),
    });

  // A real customer with a real token, granted the way an agent grants one.
  // Not a stubbed subject: the point is that the account the product can
  // actually issue reaches nothing it should not.
  const asStaff = call(staffToken);
  const customer = await (await fetch(`${url}/api/v1/customers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Census Customer', email: 'census-customer@example.com' }),
  })).json();
  const granted = await (await fetch(`${url}/api/v1/customers/${customer.id}/sign-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  })).json();
  const customerToken = (await (await signIn(customer.email, granted.initialPassword)).json()).token;

  return { app, asStaff, asCustomer: call(customerToken) };
}

// A route's path with its parameters filled in by something that exists
// nowhere. The census is about who is refused, not about what is found: a 404
// for a missing id would hide a 403 that should have come first, so anything
// that answers 404 is treated as "reached the handler" and fails.
const concrete = (path) => path.replace(/:[A-Za-z0-9_]+/g, 'census-no-such-id');

test('every route either refuses a customer or is named as open to one', async () => {
  const { app, asCustomer } = await start();
  const served = collectRoutes(app, API_V1_PREFIX);
  assert.ok(served.length > 0, 'the app served no routes — the census is reading nothing');

  const reached = [];
  for (const entry of served) {
    if (OPEN_TO_A_CUSTOMER.has(entry)) continue;
    const [method, path] = entry.split(' ');
    const res = await asCustomer(method, concrete(path));
    if (res.status !== 403) reached.push(`${entry} answered ${res.status}, not 403`);
  }

  assert.deepEqual(
    reached,
    [],
    `a route a customer can reach:\n  ${reached.join('\n  ')}\n`
      + 'Guard it with requireStaff(), or add it to OPEN_TO_A_CUSTOMER with the reason it is open.',
  );
});

test('the named-open list has no entry for a route that is no longer served', async () => {
  const { app } = await start();
  const served = new Set(collectRoutes(app, API_V1_PREFIX));

  // A stale entry is a hole waiting for the path to come back under a
  // different guard. It is also how a list stops describing anything.
  const stale = [...OPEN_TO_A_CUSTOMER.keys()].filter((entry) => !served.has(entry));
  assert.deepEqual(stale, [], `named open but not served: ${stale.join(', ')}`);
});

test('the routes named open really are open, so the list is not decoration', async () => {
  const { app, asCustomer } = await start();
  const served = new Set(collectRoutes(app, API_V1_PREFIX));

  // Every entry claims a customer can reach it. If one of them is in fact
  // 403ing, the list is a comforting fiction and the next reader will trust
  // it.
  const shut = [];
  for (const entry of OPEN_TO_A_CUSTOMER.keys()) {
    if (!served.has(entry)) continue;
    const [method, path] = entry.split(' ');
    const res = await asCustomer(method, concrete(path));
    if (res.status === 403) shut.push(entry);
  }
  assert.deepEqual(shut, [], `named open but refuses a customer: ${shut.join(', ')}`);
});
