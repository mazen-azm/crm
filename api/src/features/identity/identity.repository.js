// The only file in this feature that writes SQL.
//
// password_hash is written by insertUser and returned by exactly one read —
// findLiveUserByEmail, which sign-in needs. Every other projection omits it,
// so a later edit that returns a row wholesale cannot leak it.

// The email index is partial on deleted_at IS NULL (migration 0005), so a
// soft-deleted account frees its address and cannot be signed in as.
export function findLiveUserByEmail(db, email) {
  return db
    .prepare('SELECT id, email, password_hash, name, role FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1')
    .get(email);
}

// password_hash is deliberately absent from this projection: this row is what
// a resolved subject is built from, and a column that never leaves the
// repository cannot be leaked by a later edit that returns the row wholesale.
// `password_changed_at` is selected because the resolver compares it to the
// token's `iat` on every request. A projection that named only what its first
// caller wanted has already cost this codebase once: a column left out of a
// SELECT reads as `undefined`, and a comparison against `undefined` does not
// throw — it quietly answers "fine".
export function findLiveUserById(db, id) {
  return db
    .prepare(
      'SELECT id, name, role, password_changed_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    )
    .get(id);
}

export function insertUser(db, { id, email, passwordHash, name, role, at }) {
  return db
    .prepare(`
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, email, passwordHash, name, role, at, at);
}

// Returns the row even when it is disabled: telling "this address is taken by
// a live account" from "this address belongs to a disabled one" is the whole
// difference between a conflict and a re-enable.
export function findAnyUserByEmail(db, email) {
  return db
    .prepare('SELECT id, email, name, role, deleted_at FROM users WHERE email = ? LIMIT 1')
    .get(email);
}

export function findAnyUserById(db, id) {
  return db
    .prepare('SELECT id, email, name, role, created_at, updated_at, deleted_at FROM users WHERE id = ? LIMIT 1')
    .get(id);
}

// The hash, alone, for the one caller that has to compare against it.
//
// findAnyUserById deliberately does not select it — a general read that
// carried the hash would put it in every row every caller holds, and the
// publicShape above it exists precisely so that cannot happen. Widening that
// query to serve this would undo the reason it is narrow.
//
// Returns null for a missing or disabled account, so a caller cannot tell the
// two apart from what comes back.
export function findPasswordHashById(db, id) {
  return (
    db
      .prepare('SELECT password_hash AS hash FROM users WHERE id = ? AND deleted_at IS NULL')
      .get(id)?.hash ?? null
  );
}

// Every admin still on the roster.
//
// Live only: an escalation notifying a disabled account is a notification
// nobody will read, and the roster is the answer to "who is answerable now"
// rather than "who ever was".
export function listLiveAdminIds(db) {
  return db
    .prepare("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at ASC, rowid ASC")
    .all()
    .map((row) => row.id);
}

export function listLiveUsers(db, { limit, offset }) {
  return db
    .prepare(`
      SELECT id, email, name, role, created_at, updated_at
      FROM users WHERE deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset);
}

export function countLiveUsers(db) {
  return db.prepare('SELECT count(*) AS n FROM users WHERE deleted_at IS NULL').get().n;
}

export function countLiveAdmins(db) {
  return db
    .prepare("SELECT count(*) AS n FROM users WHERE role = 'admin' AND deleted_at IS NULL")
    .get().n;
}

export function updateUserRole(db, { id, role, at }) {
  return db
    .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
    .run(role, at, id).changes;
}

// Disabling is BR-2 in one statement: a timestamp, never a DELETE.
export function disableUser(db, { id, at }) {
  return db
    .prepare('UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
    .run(at, at, id).changes;
}

// The `deleted_at IS NULL` is defence in depth: the service refuses a disabled
// account before it gets here, and a row-level guard means a disable landing
// between the two cannot leave a disabled account with a fresh password. The
// caller reads `changes` for the same reason every other writer here does.
//
// `password_changed_at` moves with the hash, in the same statement. Both
// routes that set a password come through here — the person changing their own
// and the admin setting somebody else's — so ending the old sessions cannot be
// remembered on one path and forgotten on the other. That is the whole reason
// it is written here rather than by each caller.
export function updateUserPassword(db, { id, passwordHash, at, changedAt }) {
  return db
    .prepare(`
      UPDATE users
         SET password_hash = ?, password_changed_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL
    `)
    .run(passwordHash, changedAt, at, id).changes;
}

export function reEnableUser(db, { id, at }) {
  return db
    .prepare('UPDATE users SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL')
    .run(at, id).changes;
}

// Which customer this user account belongs to, or null. I-1 puts the link on
// `customers`, so this reads that table — the same thing tickets does for a
// customer id, and for the same reason its comment gives: verify-architecture's
// rule is about imports, not about which table a query names. Importing the
// customers repository would be reaching into a sibling feature's internals;
// naming its table here is not.
export function findCustomerIdByUserId(db, userId) {
  return (
    db
      .prepare('SELECT id FROM customers WHERE user_id = ? AND deleted_at IS NULL')
      .get(userId)?.id ?? null
  );
}
