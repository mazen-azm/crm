import { HttpError } from './errors.js';

// A counter on two keys, with a rolling window. Two callers use it and neither
// owns it, which is why it sits in platform: sign-in counts failed attempts per
// account and per host, and the public intake counts every arrival per host.
//
// Two keys rather than one, because a single ceiling only stops one shape:
// per-subject alone lets one host walk the whole staff list five guesses at a
// time, and per-address alone lets a botnet spend one guess per host on the
// same account forever.
//
// It lived in identity/ until the intake needed it. Copying it would have been
// two answers to how long a window is; reaching into identity/ for it is a
// feature importing a sibling's internals, which verify-architecture refuses.
// Platform is the place both may legally read and neither has to own.
//
// The vocabulary is deliberately neutral. It was `email`, `recordFailure` and
// `recordSuccess`, written for the only caller there was — and at the intake's
// call site `recordFailure` after a 201 would be a lie in the code, which is
// worse than the churn of renaming it.
//
// LIMITATION — process-local. A second api process keeps its own Maps, so the
// ceilings are per-process, not per-cluster. A shared store is a dependency
// this story deliberately does not take; when there is a second process there
// is a story for it.
//
// LIMITATION — the caller decides what "address" means. This unit never reads
// a request. app.js sets no trust-proxy, so today the route hands it the
// socket peer, which behind a reverse proxy is the proxy. Named here so the
// number is read for what it is.
export function createKeyedThrottle({
  now,                          // () => seconds, the same clock the caller uses
  windowSeconds = 15 * 60,
  // The thing being acted on — an account, for sign-in. A caller that counts
  // only by host leaves it out, and a null key is simply not counted.
  subjectCeiling = 5,
  addressCeiling = 20,          // events from one host per window
} = {}) {
  const subjects = new Map();
  const addresses = new Map();

  // Expiry is read, not swept. Nothing schedules work: an entry whose window
  // has passed is simply not counted the next time somebody looks at it, and
  // the look happens on every request anyway. A setInterval here would be a
  // timer holding the process open for counters nobody is asking about.
  const live = (store, key) => {
    if (key === null || key === undefined) return null;
    const entry = store.get(key);
    if (entry === undefined) return null;
    if (now() >= entry.resetAt) {
      store.delete(key);
      return null;
    }
    return entry;
  };

  const bump = (store, key) => {
    if (key === null || key === undefined) return;
    const entry = live(store, key);
    if (entry === null) {
      store.set(key, { count: 1, resetAt: now() + windowSeconds });
      return;
    }
    // The window is anchored to the first event in it, not refreshed by the
    // latest one. A refreshing window never reopens while the events keep
    // coming, which turns a throttle into a permanent lockout — and a lockout
    // somebody else can trigger on your account by guessing badly at it.
    entry.count += 1;
  };

  return {
    // Throws as soon as EITHER ceiling stands. It says nothing about which,
    // because which one it was tells the caller whether the account exists.
    check({ subject = null, address = null } = {}) {
      const bySubject = live(subjects, subject);
      const byAddress = live(addresses, address);
      const tripped =
        (bySubject !== null && bySubject.count >= subjectCeiling) ||
        (byAddress !== null && byAddress.count >= addressCeiling);
      if (tripped) throw new HttpError(429, 'RATE_LIMITED');
    },

    count({ subject = null, address = null } = {}) {
      bump(subjects, subject);
      bump(addresses, address);
    },

    // The subject counter only. For sign-in: whoever just proved the password
    // owns the account, so holding failures against it protects nobody. The
    // intake never calls this — clearing on success would hand a fresh budget
    // to whoever landed one real-looking form.
    //
    // The address counter is NOT cleared here, and that is the point:
    // credential stuffing lands sometimes — landing is its whole shape — so a
    // success that cleared the host's counter would hand the attacker a fresh
    // sweep budget every time one guess worked, and the address ceiling would
    // never be reached by the only traffic it exists to stop.
    forget({ subject }) {
      if (subject !== null && subject !== undefined) subjects.delete(subject);
    },

    // Test seam. Production reads nothing here.
    _size() {
      return { subjects: subjects.size, addresses: addresses.size };
    },
  };
}
