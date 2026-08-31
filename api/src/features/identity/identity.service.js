import { randomUUID } from 'node:crypto';

import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { verifyPassword, hashPassword, DUMMY_PASSWORD_HASH } from '../../shared/password.js';
import { createAuditWriter } from '../audit/index.js';
import { createKeyedThrottle } from '../../platform/http/throttle.js';
import {
  countLiveAdmins,
  countLiveUsers,
  disableUser,
  findAnyUserByEmail,
  findAnyUserById,
  findPasswordHashById,
  findLiveUserByEmail,
  insertUser,
  listLiveUsers,
  reEnableUser,
  updateUserPassword,
  updateUserRole,
} from './identity.repository.js';
import {
  TOKEN_TTL_SECONDS,
  generateInitialPassword,
  normaliseEmail,
  signToken,
  validateCredentials,
  validateNewPassword,
  validateNewAccount,
  validateRoleChange,
} from './identity.rules.js';

// What an account looks like to anyone outside this feature. password_hash is
// not a field here and never will be.
const publicShape = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  createdAt: row.created_at ?? null,
  updatedAt: row.updated_at ?? null,
  deletedAt: row.deleted_at ?? null,
});

// The row the assignee picker gets: id, name, role and nothing else. Email is
// deliberately absent — a picker does not need staff addresses, and every field
// that travels is a field that has to keep being safe. That is why it does not
// reuse publicShape rather than being a narrowing of it.
const assigneeShape = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role,
});

export function createIdentityService({ db, secret, now = () => Math.floor(Date.now() / 1000) }) {
  const stamp = () => new Date(now() * 1000).toISOString();

  // One throttle per service instance, so every composeApp — and so every
  // test — starts with empty counters and cannot inherit another test's.
  const throttle = createKeyedThrottle({ now });

  // Every mutation writes its audit row inside the same transaction. An audit
  // trail with gaps in it is worse than none, because it is believed.
  //
  // The writer itself belongs to the audit feature, not to this one: BR-2 is a
  // rule about every mutation in the system, and a rule that global cannot be
  // owned by whichever feature happened to need it first.
  const audit = createAuditWriter({ db });
  const record = (actor, event) => audit.record(actor, event);

  // The system must never be left with nobody who can administer it — the
  // seed guarantees one admin at boot and this keeps that true afterwards.
  const wouldRemoveLastAdmin = (row, becomingRole) =>
    row.role === 'admin' && becomingRole !== 'admin' && countLiveAdmins(db) === 1;


  // One user row and its audit event, with NO transaction of its own — the
  // caller owns that.
  //
  // It exists because two callers create a user now: the accounts route, which
  // wraps it in a transaction it opens itself, and CUSTOMERS-6-API, which has
  // to write the row and the customers.user_id link together or leave an
  // account belonging to nobody. SQLite refuses a transaction inside a
  // transaction, so a `createUser` that opened its own could not be called
  // from inside the customers service's — which is exactly the trap
  // resolveByEmail's comment warns its caller about.
  //
  // Validation and the address-taken check stay with the callers: one of them
  // takes a role from a request body and the other supplies it, and a shared
  // validator would have to accept both meanings.
  const makeUser = (actor, { email, name, role }) => {
    const id = randomUUID();
    const initialPassword = generateInitialPassword();
    const at = stamp();

    insertUser(db, { id, email, passwordHash: hashPassword(initialPassword), name, role, at });
    record(actor, {
      entity: 'user', entityId: id, verb: 'user.create', at,
      // No password and no hash, here or anywhere. The audit guarantee test
      // asserts it of every diff this API writes.
      before: null, after: { email, name, role },
    });

    return {
      user: { id, email, name, role, createdAt: at, updatedAt: at, deletedAt: null },
      initialPassword,
    };
  };

  // One place that mints a token, so `iat` cannot be set here and forgotten
  // there. It is the moment the token is issued, in the same whole seconds as
  // `exp`, and it is what a password change is compared against.
  const mint = (row) =>
    signToken(
      { sub: row.id, role: row.role, exp: now() + TOKEN_TTL_SECONDS, iat: now() },
      secret,
    );

  return {
    // Not a route. CUSTOMERS-6-API grants a customer a sign-in, which is one
    // user row and one customers.user_id written together — so it calls this
    // from inside its own transaction. Exposed on the service rather than
    // imported, because a feature reaches another only through its index, and
    // compose.js hands this one over the way it hands over tickets.
    makeUser,

    signIn({ email, password }, { address = null } = {}) {
      // The shape of the request and the truth of the credential are separate
      // questions, asked in that order. A malformed body is 422 naming the
      // fields; only a well-formed one can be wrong.
      const invalid = validateCredentials({ email, password });
      if (invalid.length > 0) throw unprocessable(invalid);

      const key = normaliseEmail(email);

      // 422, then 429, then 401. The shape check comes first so garbage cannot
      // be used to fill the counters; the throttle comes before the credential
      // check so a 429 is the same answer whether the account exists or not.
      throttle.check({ subject: key, address });

      const row = findLiveUserByEmail(db, key);

      // When no account matched we still hash the candidate, against a dummy.
      // DO NOT DELETE: without it the unknown-email path returns faster than
      // the wrong-password path, and the difference is a way to find out who
      // works here.
      const correct = verifyPassword(password, row ? row.password_hash : DUMMY_PASSWORD_HASH);

      // One answer for a wrong password, an unknown address, and a
      // soft-deleted account. A response that told them apart would be a
      // directory of the staff.
      if (!row || !correct) {
        throttle.count({ subject: key, address });
        throw new HttpError(401, 'UNAUTHENTICATED');
      }

      // The account counter only. Clearing the address counter here would let
      // one landed guess buy a fresh sweep budget for the host that made it.
      throttle.forget({ subject: key });

      return {
        token: mint(row),
        user: { id: row.id, role: row.role, name: row.name },
      };
    },

    // The routes below are guarded by requirePermission before the service is
    // entered, so none of them re-checks the role. Two places deciding one
    // rule is two places to get it wrong.

    createAccount(actor, { email, name, role }) {
      const wrong = validateNewAccount({ email, name, role });
      if (wrong.length > 0) throw unprocessable(wrong);

      const address = normaliseEmail(email);
      const existing = findAnyUserByEmail(db, address);
      // Taken is taken, whether the holder is live or disabled. Re-enabling is
      // a different verb with its own route; creating over a disabled row
      // would quietly discard whatever that person's history says.
      if (existing) throw new HttpError(409, 'CONFLICT');

      db.exec('BEGIN');
      let made;
      try {
        made = makeUser(actor, { email: address, name, role });
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }

      return {
        user: made.user,
        initialPassword: made.initialPassword,
      };
    },

    listAccounts(actor, { limit, offset }) {
      // A read is not a mutation, so it writes no audit row.
      return {
        items: listLiveUsers(db, { limit, offset }).map(publicShape),
        total: countLiveUsers(db),
        limit,
        offset,
      };
    },

    // Any signed-in staff member may read this; the guard is requireSubject in
    // the router, not adminOnly — an agent who cannot see the list cannot hand
    // a ticket over. Both admin and agent are staff and both are assignable.
    //
    // There is no "not a customer" predicate here and there must not be one.
    // users holds staff only and ROLES freezes admin|agent; customers are their
    // own table. A predicate for it would be dead code telling a later reader
    // the schema allows something it does not.
    //
    // A read is not a mutation, so it writes no audit row.
    listAssignees(actor, { limit, offset }) {
      return {
        items: listLiveUsers(db, { limit, offset }).map(assigneeShape),
        total: countLiveUsers(db),
        limit,
        offset,
      };
    },

    changeRole(actor, { id, role }) {
      const wrong = validateRoleChange({ role });
      if (wrong.length > 0) throw unprocessable(wrong);

      const before = findAnyUserById(db, id);
      if (!before || before.deleted_at != null) throw new HttpError(404, 'NOT_FOUND');
      // A no-op is not a mutation, and an audit row for one is noise that
      // makes the real entries harder to find.
      if (before.role === role) return { user: publicShape(before), changed: false };
      if (wouldRemoveLastAdmin(before, role)) throw new HttpError(409, 'CONFLICT');

      const at = stamp();
      db.exec('BEGIN');
      try {
        updateUserRole(db, { id, role, at });
        record(actor, {
          entity: 'user', entityId: id, verb: 'user.role.change', at,
          before: { role: before.role }, after: { role },
        });
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }

      return { user: publicShape({ ...before, role, updated_at: at }), changed: true };
    },

    disableAccount(actor, { id }) {
      const before = findAnyUserById(db, id);
      if (!before) throw new HttpError(404, 'NOT_FOUND');
      if (before.deleted_at != null) throw new HttpError(409, 'CONFLICT');
      if (wouldRemoveLastAdmin(before, null)) throw new HttpError(409, 'CONFLICT');

      const at = stamp();
      db.exec('BEGIN');
      try {
        disableUser(db, { id, at });
        record(actor, {
          entity: 'user', entityId: id, verb: 'user.disable', at,
          before: { deletedAt: null }, after: { deletedAt: at },
        });
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }

      return { user: publicShape({ ...before, deleted_at: at, updated_at: at }) };
    },

    // Anybody changes their own password, knowing the current one. One route
    // and one method for every role: an admin changing their OWN password
    // comes here, not to setPassword — the whole reason setPassword refuses a
    // caller their own account.
    changeOwnPassword(actor, { currentPassword, newPassword }) {
      const missing = [];
      if (typeof currentPassword !== 'string' || currentPassword === '') missing.push('currentPassword');
      if (missing.length > 0) throw unprocessable(missing);
      // The same floor an admin's set is held to. One predicate, not two: a
      // fork drifts, and the drift shows up as a password one route accepts
      // and the other refuses.
      if (validateNewPassword({ password: newPassword }).length > 0) {
        throw unprocessable(['newPassword']);
      }

      // The hash on its own, from the one query that selects it.
      // findAnyUserById does not — a general read carrying the hash would put
      // it in every row every caller holds — so this asks for the one thing it
      // needs. Null covers both a missing account and a disabled one, and the
      // answer is the same 401 either way.
      const storedHash = findPasswordHashById(db, actor.id);
      if (!storedHash) throw new HttpError(401, 'UNAUTHENTICATED');

      // 401 for a wrong current password, 422 for a new one that will not do,
      // and the difference from sign-in is deliberate. Sign-in answers one
      // refusal for a wrong password, an unknown address and a disabled
      // account, so the response cannot be used to learn which addresses
      // exist. That reasoning does not reach here: this caller is already
      // authenticated and already knows the account exists, because they are
      // in it. Telling them which half they got wrong leaks nothing and saves
      // them guessing.
      if (!verifyPassword(currentPassword, storedHash)) {
        throw new HttpError(401, 'UNAUTHENTICATED');
      }

      // Compared against the STORED HASH rather than by hashing the new one
      // and comparing strings: every hash has its own salt, so the same
      // password hashed twice gives two different strings and the comparison
      // would never fire.
      //
      // A change that changes nothing is a change somebody believes they made
      // — and will act on, by not changing it again.
      if (verifyPassword(newPassword, storedHash)) throw unprocessable(['newPassword']);

      const at = stamp();
      db.exec('BEGIN');
      try {
        updateUserPassword(db, { id: actor.id, passwordHash: hashPassword(newPassword), at, changedAt: now() });
        record(actor, {
          entity: 'user', entityId: actor.id, verb: 'user.change-own-password', at,
          before: null, after: { passwordSetAt: at },
        });
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }

      // Not throttled, and that is a decision. Sign-in throttles guesses
      // because the guesser has nothing yet; whoever reaches here already
      // holds a session, so guessing the current password buys them a password
      // they could have changed anyway.
      //
      // A fresh token, and this is what makes "every OTHER session" true.
      // Every token issued before this second is now refused by the resolver —
      // including the one the caller sent with this very request. Answering
      // with a new one keeps the session that made the change and needs no
      // rule to tell it apart from the ones being ended, which on a whole-second
      // clock could not be written anyway.
      return { id: actor.id, updatedAt: at, token: mint(findAnyUserById(db, actor.id)) };
    },

    // An admin sets somebody else's password, so a locked-out person gets back
    // in. There is no reset-by-email in this product — the brief puts it under
    // "Specified only" — which is why a person who forgets theirs needs a
    // colleague rather than a link.
    setPassword(actor, { id, password }) {
      const wrong = validateNewPassword({ password });
      if (wrong.length > 0) throw unprocessable(wrong);

      const target = findAnyUserById(db, id);
      if (!target) throw new HttpError(404, 'NOT_FOUND');

      // A disabled account is refused. Bringing somebody back is re-enable,
      // with its own route and its own audit row; setting a password through
      // this door would leave the account's state saying one thing and its
      // access saying another.
      if (target.deleted_at != null) throw new HttpError(409, 'CONFLICT');

      // Not on yourself, and this is the decision most likely to be missed.
      // Setting somebody else's is for a person who is locked out; changing
      // your own is IDENTITY-7-API and asks for the current one. An admin who
      // can skip that check on themselves turns a stolen session into a
      // permanent one — the thief never has to know a password.
      //
      // 403 rather than 409: they are allowed on this route and not allowed on
      // this target, which is what 403 says. Nothing about the state conflicts.
      if (actor?.id === id) throw new HttpError(403, 'FORBIDDEN');

      const at = stamp();
      db.exec('BEGIN');
      try {
        updateUserPassword(db, { id, passwordHash: hashPassword(password), at, changedAt: now() });
        record(actor, {
          entity: 'user', entityId: id, verb: 'user.set-password', at,
          // Neither the password nor its hash, on either side — the audit
          // guarantee test asserts that of every diff this API writes. What
          // the trail needs is that it happened, when, and who did it, and the
          // row carries all three without the secret.
          //
          // before is null rather than { passwordSet: true }: a diff whose two
          // halves are identical reads as a change that changed nothing.
          before: null, after: { passwordSetAt: at },
        });
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }

      // No password comes back. The admin typed it; there is nothing to read.
      //
      // Tokens issued before this stay valid until they expire. Ending them is
      // IDENTITY-8-API, and this is a stated gap rather than an oversight: a
      // password set for somebody locked out does not, today, sign out whoever
      // may be holding their old session.
      return { id, updatedAt: at };
    },

    reEnableAccount(actor, { id }) {
      const before = findAnyUserById(db, id);
      if (!before) throw new HttpError(404, 'NOT_FOUND');
      if (before.deleted_at == null) throw new HttpError(409, 'CONFLICT');

      // The partial unique index freed this address while the row was
      // disabled, so somebody may have taken it since.
      const holder = findAnyUserByEmail(db, before.email);
      if (holder && holder.id !== before.id && holder.deleted_at == null) {
        throw new HttpError(409, 'CONFLICT');
      }

      const at = stamp();
      db.exec('BEGIN');
      try {
        reEnableUser(db, { id, at });
        record(actor, {
          entity: 'user', entityId: id, verb: 'user.re-enable', at,
          before: { deletedAt: before.deleted_at }, after: { deletedAt: null },
        });
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }

      return { user: publicShape({ ...before, deleted_at: null, updated_at: at }) };
    },
  };
}
