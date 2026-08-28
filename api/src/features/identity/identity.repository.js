// The only file in this feature that writes SQL.

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
