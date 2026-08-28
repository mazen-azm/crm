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
export function findLiveUserById(db, id) {
  return db
    .prepare('SELECT id, name, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1')
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

export function reEnableUser(db, { id, at }) {
  return db
    .prepare('UPDATE users SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL')
    .run(at, id).changes;
}
