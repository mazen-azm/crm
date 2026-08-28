import { randomUUID } from 'node:crypto';

import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { verifyPassword, hashPassword, DUMMY_PASSWORD_HASH } from '../../shared/password.js';
import { createAuditWriter } from '../audit/index.js';
import { createSignInThrottle } from './identity.throttle.js';
import {
  countLiveAdmins,
  countLiveUsers,
  disableUser,
  findAnyUserByEmail,
  findAnyUserById,
  findLiveUserByEmail,
  insertUser,
  listLiveUsers,
  reEnableUser,
  updateUserRole,
} from './identity.repository.js';
import {
  TOKEN_TTL_SECONDS,
  generateInitialPassword,
  normaliseEmail,
  signToken,
  validateCredentials,
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
  const throttle = createSignInThrottle({ now });

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

  return {
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
      throttle.checkAllowed({ email: key, address });

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
        throttle.recordFailure({ email: key, address });
        throw new HttpError(401, 'UNAUTHENTICATED');
      }

      // The account counter only. Clearing the address counter here would let
      // one landed guess buy a fresh sweep budget for the host that made it.
      throttle.recordSuccess({ email: key });

      return {
        token: signToken(
          { sub: row.id, role: row.role, exp: now() + TOKEN_TTL_SECONDS },
          secret,
        ),
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

      const id = randomUUID();
      const initialPassword = generateInitialPassword();
      const at = stamp();

      db.exec('BEGIN');
      try {
        insertUser(db, { id, email: address, passwordHash: hashPassword(initialPassword), name, role, at });
        record(actor, {
          entity: 'user', entityId: id, verb: 'user.create', at,
          before: null, after: { email: address, name, role },
        });
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }

      return {
        user: { id, email: address, name, role, createdAt: at, updatedAt: at, deletedAt: null },
        initialPassword,
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
