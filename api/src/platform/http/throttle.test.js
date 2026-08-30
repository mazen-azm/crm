// Proves the throttle unit in isolation. The account/address isolation lives
// here rather than in the integration suite because here an address is just a
// string; over a real socket every request has the same peer and the only way
// to vary it is trust-proxy, which IDENTITY-4-API deliberately does not set.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createKeyedThrottle } from './throttle.js';

const A = 'a@support-desk.local';
const B = 'b@support-desk.local';

// A clock the test drives. The throttle takes seconds, like the rest of identity.
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (seconds) => { t += seconds; } };
}

const fail = (throttle, times, keys) => {
  for (let i = 0; i < times; i += 1) throttle.count(keys);
};

test('under both ceilings nothing is thrown', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now });
  fail(throttle, 4, { subject: A, address: '10.0.0.1' });
  assert.doesNotThrow(() => throttle.check({ subject: A, address: '10.0.0.1' }));
});

test('the account ceiling stops that account and no other', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, subjectCeiling: 5 });
  fail(throttle, 5, { subject: A, address: '10.0.0.1' });

  assert.throws(
    () => throttle.check({ subject: A, address: '10.0.0.1' }),
    (e) => e.status === 429 && e.code === 'RATE_LIMITED',
  );
  // The other account is untouched: the ceiling protects one account, it does
  // not punish the host for reaching it.
  assert.doesNotThrow(() => throttle.check({ subject: B, address: '10.0.0.1' }));
});

test('the address ceiling stops that host, across every account it tried', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, subjectCeiling: 5, addressCeiling: 20 });
  // Twenty accounts, one failure each: no account is near its own ceiling, so
  // only the address counter can be what trips.
  for (let i = 0; i < 20; i += 1) throttle.count({ subject: `u${i}@x.local`, address: '10.0.0.9' });

  assert.throws(
    () => throttle.check({ subject: 'fresh@x.local', address: '10.0.0.9' }),
    (e) => e.status === 429 && e.code === 'RATE_LIMITED',
  );
  assert.doesNotThrow(() => throttle.check({ subject: 'fresh@x.local', address: '10.0.0.10' }));
});

test('the window elapses on its own, with nothing sweeping it', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, windowSeconds: 900, subjectCeiling: 5 });
  fail(throttle, 5, { subject: A, address: '10.0.0.1' });
  assert.throws(() => throttle.check({ subject: A, address: '10.0.0.1' }));

  c.advance(901);
  assert.doesNotThrow(() => throttle.check({ subject: A, address: '10.0.0.1' }));
});

test('a success clears the account counter', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, subjectCeiling: 5 });
  fail(throttle, 4, { subject: A, address: '10.0.0.1' });
  throttle.forget({ subject: A });

  // Four more failures would have been nine without the reset, well past five.
  fail(throttle, 4, { subject: A, address: '10.0.0.1' });
  assert.doesNotThrow(() => throttle.check({ subject: A, address: '10.0.0.1' }));
});

test('a success does NOT clear the address counter', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, subjectCeiling: 5, addressCeiling: 20 });
  // Nineteen misses from one host, then one account it does own. If landing a
  // guess reset the host's budget, the sweep would be free and the address
  // ceiling would never be reached by the only traffic it exists to stop.
  for (let i = 0; i < 19; i += 1) throttle.count({ subject: `u${i}@x.local`, address: '10.0.0.9' });
  throttle.forget({ subject: 'u0@x.local' });

  throttle.count({ subject: 'u19@x.local', address: '10.0.0.9' });
  assert.throws(
    () => throttle.check({ subject: 'fresh@x.local', address: '10.0.0.9' }),
    (e) => e.status === 429 && e.code === 'RATE_LIMITED',
  );
});

test('the window is anchored to the first failure, so a persistent guesser cannot lock an account for ever', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, windowSeconds: 900, subjectCeiling: 5 });
  fail(throttle, 5, { subject: A, address: '10.0.0.1' });

  // Someone keeps guessing at my account every few minutes. If each failure
  // pushed the window out, I would never get back in — a lockout a stranger
  // can hold open is a denial of service wearing a security control's clothes.
  for (let i = 0; i < 3; i += 1) {
    c.advance(300);
    throttle.count({ subject: A, address: '10.0.0.1' });
  }
  assert.doesNotThrow(() => throttle.check({ subject: A, address: '10.0.0.1' }));
});

test('a missing address is skipped, not counted under a key of its own', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, addressCeiling: 2 });
  fail(throttle, 5, { subject: A, address: null });
  assert.equal(throttle._size().addresses, 0);
});

test('the throttled error carries no fields — a 429 names nothing', () => {
  const c = clock();
  const throttle = createKeyedThrottle({ now: c.now, subjectCeiling: 1 });
  throttle.count({ subject: A, address: '10.0.0.1' });
  try {
    throttle.check({ subject: A, address: '10.0.0.1' });
    assert.fail('expected the throttle to refuse');
  } catch (e) {
    assert.equal(e.status, 429);
    assert.equal(e.fields, undefined);
  }
});
