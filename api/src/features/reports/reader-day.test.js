// Proves scripts/criteria/reports.md section REPORTS-4-API.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { composeApp } from '../../compose.js';
import { openDatabase } from '../../platform/db/connection.js';
import { seed } from '../../platform/db/seed.js';
import { MAX_WINDOW_DAYS, resolveReportWindow } from './reports.window.js';

const SECRET = 'reader-day-secret';
const servers = [];
after(() => servers.forEach((s) => s.close()));

// 22:30 UTC. In Cairo it is already 01:30 the NEXT day; in New York it is
// 18:30 the same day. This one instant is the whole story.
const LATE = Math.floor(Date.parse('2026-09-02T22:30:00Z') / 1000);

async function start(at = LATE) {
  const db = openDatabase(':memory:');
  const { adminEmail, adminPassword } = seed(db);
  const server = composeApp({ db, secret: SECRET, now: () => at }).listen(0);
  servers.push(server);
  const url = `http://127.0.0.1:${server.address().port}`;

  const { token } = await (await fetch(`${url}/api/v1/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })).json();

  const call = (path, { method = 'GET', body } = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const customerId = (await (await call('/api/v1/customers?limit=1')).json()).items[0].id;
  const raise = async (subject = 'Raised late') =>
    (await (await call('/api/v1/tickets', {
      method: 'POST', body: { customerId, subject, body: 'Body.' },
    })).json());

  return { db, call, raise };
}

test('a ticket raised at 01:30 in Cairo is in the Cairo reader\'s today', async () => {
  const { call, raise } = await start();
  await raise();

  // Stored 22:30Z on 2 September. In Cairo that is 01:30 on the 3rd, and the
  // reader's today is the 3rd — so the window has to reach back across the UTC
  // midnight to find it. `date(created_at)` would put it in yesterday and the
  // report would be missing their morning.
  const body = await (await call('/api/v1/reports/queue-by-status?timeZone=Africa/Cairo')).json();

  assert.equal(body.window.from, '2026-09-03');
  assert.equal(body.window.startUtc, '2026-09-02T21:00:00.000Z');
  assert.equal(body.counts.new, 1);
  assert.equal(body.total, 1);
});

test('the same ticket is in the New York reader\'s today too, and it is a different day', async () => {
  const { call, raise } = await start();
  await raise();

  const body = await (await call('/api/v1/reports/queue-by-status?timeZone=America/New_York')).json();

  // 18:30 on the 2nd there. Same instant, different calendar day, and the
  // window is a different pair of instants — which is the point.
  assert.equal(body.window.from, '2026-09-02');
  assert.equal(body.window.startUtc, '2026-09-02T04:00:00.000Z');
  assert.equal(body.counts.new, 1);
});

test('a reader behind UTC does not get tomorrow morning as today', async () => {
  // 02:00 UTC on the 3rd. In New York it is still 22:00 on the 2nd.
  const early = Math.floor(Date.parse('2026-09-03T02:00:00Z') / 1000);
  const { call, raise } = await start(early);
  await raise();

  const body = await (await call('/api/v1/reports/queue-by-status?timeZone=America/New_York')).json();

  assert.equal(body.window.from, '2026-09-02');
  // The ticket was stored at 02:00Z on the 3rd, which is 22:00 on the 2nd
  // there, so it IS in their today — the mirror of the Cairo case.
  assert.equal(body.counts.new, 1);

  // And in UTC the same request is about the 3rd, and finds it there instead.
  const utc = await (await call('/api/v1/reports/queue-by-status?timeZone=UTC')).json();
  assert.equal(utc.window.from, '2026-09-03');
});

test('a ticket outside the window is not counted, and the snapshot still sees it', async () => {
  const { db, call, raise } = await start();
  const old = await raise('Raised a week ago');
  db.prepare('UPDATE tickets SET created_at = ? WHERE id = ?')
    .run('2026-08-26T10:00:00.000Z', old.id);
  await raise('Raised today');

  const today = await (await call('/api/v1/reports/queue-by-status?timeZone=Africa/Cairo')).json();
  assert.equal(today.total, 1);

  // No window at all: the report is the snapshot it has always been, and every
  // caller written before this parameter existed keeps the answer it had.
  const all = await (await call('/api/v1/reports/queue-by-status')).json();
  assert.equal(all.total, 2);
  assert.equal(all.window, null);
});

test('an unknown zone is refused naming the field, and never treated as UTC', async () => {
  const { call } = await start();

  const res = await call('/api/v1/reports/queue-by-status?timeZone=Middle/Earth');
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.code, 'VALIDATION_FAILED');
  assert.deepEqual(body.fields, ['timeZone']);
});

test('a range with no zone to read it in is refused', async () => {
  const { call } = await start();

  // Two calendar dates and nothing that says whose calendar. Falling back to
  // UTC here would answer a question nobody asked.
  const res = await call('/api/v1/reports/queue-by-status?from=2026-09-01&to=2026-09-02');
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ['timeZone']);
});

test('a range longer than the ceiling names both edges, because neither is at fault', async () => {
  const { call } = await start();

  const res = await call('/api/v1/reports/queue-by-status?timeZone=UTC&from=2026-01-01&to=2026-09-02');
  assert.equal(res.status, 422);
  // The span is what is wrong. A screen highlighting one of the two would be
  // pointing at the wrong control.
  assert.deepEqual((await res.json()).fields, ['from', 'to']);
  assert.ok(MAX_WINDOW_DAYS > 0);
});

test('the promise report measures the window against when a promise FINISHED', async () => {
  const { db, call, raise } = await start();
  const answered = await raise('Answered');
  await call(`/api/v1/tickets/${answered.id}/replies`, { method: 'POST', body: { body: 'On it.' } });

  // The ticket was raised inside today's window and its clock stopped inside
  // it too, so it counts.
  const now = await (await call('/api/v1/reports/promise-share?timeZone=Africa/Cairo')).json();
  assert.equal(now.kinds.first_response.settled, 1);

  // Move only the moment the promise finished, not the moment it was raised.
  // The share is about promises coming due, so this leaves the window.
  db.prepare("UPDATE sla_clocks SET stopped_at = '2026-07-01T10:00:00.000Z' WHERE kind = 'first_response'").run();
  const after = await (await call('/api/v1/reports/promise-share?timeZone=Africa/Cairo')).json();
  assert.equal(after.kinds.first_response.settled, 0);
  assert.equal(after.kinds.first_response.share, null);
});

test('the load report takes no window, because load is what is on somebody now', async () => {
  const { db, call, raise } = await start();
  const [agent] = (await (await call('/api/v1/accounts')).json()).items.filter((u) => u.role === 'agent');
  const old = await raise('Raised a month ago');
  await call(`/api/v1/tickets/${old.id}/assignee`, {
    method: 'PATCH', body: { assigneeId: agent.id, revision: old.revision },
  });
  db.prepare('UPDATE tickets SET created_at = ? WHERE id = ?')
    .run('2026-08-01T10:00:00.000Z', old.id);

  const body = await (await call('/api/v1/reports/agent-load?timeZone=Africa/Cairo')).json();

  // Still one. A window here would say this agent is holding nothing, which is
  // not a narrower answer — it is a false one.
  assert.equal(body.agents.find((each) => each.id === agent.id).load, 1);
});

test('the SECOND pass is the one that finds midnight when a zone changed overnight', () => {
  // New Zealand leaves daylight time at 03:00 local on 5 April 2026, which is
  // 14:00Z on the 4th. So local midnight on the 5th happens at +13, while
  // midnight UTC on the 5th falls at +12 — after the change.
  //
  // One pass measures the offset at midnight UTC, gets +12, and lands an hour
  // late at 12:00Z. The second pass measures the offset where the first one
  // landed, gets +13, and corrects to 11:00Z. Without it the report loses the
  // first hour of that day, once a year, in one hemisphere — which is exactly
  // the kind of thing nobody finds by reading.
  const now = () => Math.floor(Date.parse('2026-04-04T20:00:00Z') / 1000);
  const window = resolveReportWindow({ timeZone: 'Pacific/Auckland' }, { now });

  assert.equal(window.from, '2026-04-05');
  assert.equal(window.startUtc, '2026-04-04T11:00:00.000Z');
  // And the far edge is 25 hours later, because that local day is 25 hours
  // long. `start + 24h` would end it an hour early.
  assert.equal(window.endUtc, '2026-04-05T12:00:00.000Z');
});

test('the boundary is computed twice, because a zone changes offset', () => {
  const now = () => Math.floor(Date.parse('2026-03-29T12:00:00Z') / 1000);
  // London moves to BST on 29 March 2026. Midnight local that day is 00:00Z,
  // and midnight local the NEXT day is 23:00Z — an hour short of 24, because
  // the day itself is 23 hours long. A single-pass subtraction of one offset
  // lands on the wrong instant.
  const window = resolveReportWindow({ timeZone: 'Europe/London' }, { now });
  assert.equal(window.startUtc, '2026-03-29T00:00:00.000Z');
  assert.equal(window.endUtc, '2026-03-29T23:00:00.000Z');
});
