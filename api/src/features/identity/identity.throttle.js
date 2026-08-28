import { HttpError } from '../../platform/http/errors.js';

// Counters for failed sign-ins, kept on two keys.
//
// One key is the account being attacked, the other is the host doing the
// attacking. A single ceiling only stops one shape: per-account alone lets one
// host walk the whole staff list five guesses at a time, and per-address alone
// lets a botnet spend one guess per host on the same account forever.
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
export function createSignInThrottle({
  now,                          // () => seconds, the same clock the service uses
  windowSeconds = 15 * 60,
  emailCeiling = 5,             // failures against one account per window
  addressCeiling = 20,          // failures from one host per window
} = {}) {
  const emails = new Map();
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
    // The window is anchored to the first failure in it, not refreshed by the
    // latest one. A refreshing window never reopens while the attempts keep
    // coming, which turns a throttle into a permanent lockout — and a lockout
    // somebody else can trigger on your account by guessing badly at it.
    entry.count += 1;
  };

  return {
    // Throws as soon as EITHER ceiling stands. It says nothing about which,
    // because which one it was tells the caller whether the account exists.
    checkAllowed({ email, address = null }) {
      const byEmail = live(emails, email);
      const byAddress = live(addresses, address);
      const tripped =
        (byEmail !== null && byEmail.count >= emailCeiling) ||
        (byAddress !== null && byAddress.count >= addressCeiling);
      if (tripped) throw new HttpError(429, 'RATE_LIMITED');
    },

    recordFailure({ email, address = null }) {
      bump(emails, email);
      bump(addresses, address);
    },

    // The account counter only. Whoever just proved the password owns the
    // account, so holding failures against it protects nobody.
    //
    // The address counter is NOT cleared here, and that is the point:
    // credential stuffing lands sometimes — landing is its whole shape — so a
    // success that cleared the host's counter would hand the attacker a fresh
    // sweep budget every time one guess worked, and the address ceiling would
    // never be reached by the only traffic it exists to stop.
    recordSuccess({ email }) {
      if (email !== null && email !== undefined) emails.delete(email);
    },

    // Test seam. Production reads nothing here.
    _size() {
      return { emails: emails.size, addresses: addresses.size };
    },
  };
}
