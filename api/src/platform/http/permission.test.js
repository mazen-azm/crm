// Proves scripts/criteria/platform.md, section PLATFORM-4-API, at the unit
// level: no subject is 401, a refused policy is 403, only strict true
// permits, and every decision is taken by the middleware — no server needed,
// the middlewares are plain functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HttpError } from './errors.js';
import { attachSubject, requireSubject, requirePermission } from './permission.js';

function capture() {
  const calls = [];
  return { calls, next: (...args) => calls.push(args) };
}

test('attachSubject() default resolver sets req.subject = null and calls next()', async () => {
  const req = {};
  const { calls, next } = capture();
  await attachSubject()(req, {}, next);
  assert.equal(req.subject, null);
  assert.deepEqual(calls, [[]]);
});

test('attachSubject(resolver) sets the resolved subject', async () => {
  const req = {};
  const { calls, next } = capture();
  await attachSubject(async () => ({ id: 'u1' }))(req, {}, next);
  assert.deepEqual(req.subject, { id: 'u1' });
  assert.deepEqual(calls, [[]]);
});

test('attachSubject propagates a resolver throw to next(err)', async () => {
  const boom = new Error('boom');
  const { calls, next } = capture();
  await attachSubject(async () => {
    throw boom;
  })({}, {}, next);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], boom);
});

test('requireSubject() with no subject is 401 UNAUTHENTICATED', () => {
  const { calls, next } = capture();
  requireSubject()({ subject: null }, {}, next);
  const err = calls[0][0];
  assert.ok(err instanceof HttpError);
  assert.equal(err.status, 401);
  assert.equal(err.code, 'UNAUTHENTICATED');
});

test('requireSubject() with a subject calls next() clean', () => {
  const { calls, next } = capture();
  requireSubject()({ subject: { id: 'u1' } }, {}, next);
  assert.deepEqual(calls, [[]]);
});

test('requirePermission(allow) with a subject calls next() clean', async () => {
  const { calls, next } = capture();
  await requirePermission(() => true)({ subject: { id: 'u1' } }, {}, next);
  assert.deepEqual(calls, [[]]);
});

test('requirePermission(deny) is 403 FORBIDDEN — and so is any non-true', async () => {
  for (const policy of [() => false, () => 1]) {
    const { calls, next } = capture();
    await requirePermission(policy)({ subject: { id: 'u1' } }, {}, next);
    const err = calls[0][0];
    assert.ok(err instanceof HttpError);
    assert.equal(err.status, 403);
    assert.equal(err.code, 'FORBIDDEN');
  }
});

test('requirePermission awaits an async policy', async () => {
  const { calls, next } = capture();
  await requirePermission(async () => true)({ subject: { id: 'u1' } }, {}, next);
  assert.deepEqual(calls, [[]]);
});

test('requirePermission with no subject is 401 before the policy runs', async () => {
  let policyRan = false;
  const { calls, next } = capture();
  await requirePermission(() => {
    policyRan = true;
    return true;
  })({ subject: null }, {}, next);
  assert.equal(policyRan, false);
  assert.equal(calls[0][0].status, 401);
});

test('requirePermission propagates a policy throw to next(err)', async () => {
  const bug = new Error('bug');
  const { calls, next } = capture();
  await requirePermission(() => {
    throw bug;
  })({ subject: { id: 'u1' } }, {}, next);
  assert.equal(calls[0][0], bug);
});

test('requirePermission(non-function) throws TypeError at factory time', () => {
  assert.throws(() => requirePermission('not-a-fn'), TypeError);
});

test('the policy receives the actual subject as its first argument', async () => {
  let seen = null;
  const { next } = capture();
  await requirePermission((s) => {
    seen = s;
    return s.id === 'u1';
  })({ subject: { id: 'u1' } }, {}, next);
  assert.deepEqual(seen, { id: 'u1' });
});
