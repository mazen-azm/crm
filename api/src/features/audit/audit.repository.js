// The only file in this feature that writes SQL, and it writes exactly one
// statement. audit_events has no updated_at and no deleted_at (see
// migrations/0004__audit_events.sql), so there is no update and no delete to
// expose: BR-1 keeps the rows safe once they land, BR-2 makes sure they do.
export function insertAuditEvent(db, { id, actorId, entity, entityId, verb, at, diff }) {
  return db
    .prepare(`
      INSERT INTO audit_events (id, actor_id, entity, entity_id, verb, at, diff)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, actorId, entity, entityId, verb, at, diff);
}

// One thing's trail, oldest first.
//
// `at` is a whole-second ISO string — audit.service.js's stamp() resolves to
// `.000Z` — so two changes in the same second carry an identical `at` and
// ORDER BY at alone leaves their order to SQLite. rowid is insertion order and
// is the tiebreak. A test writes two rows sharing an `at` and asserts which
// comes first, because a tiebreak nothing exercises is a tiebreak nobody knows
// is there (L-37).
//
// The index at 0004__audit_events.sql:12 is (entity, entity_id, at DESC), and
// SQLite walks a b-tree backwards at no cost for ORDER BY at ASC. No second
// index: a test asserts the planner uses this one rather than sorting, so the
// claim is checked rather than assumed.
export function listAuditEvents(db, { entity, entityId, limit, offset }) {
  return db
    .prepare(`
      SELECT id, actor_id, verb, at, diff
        FROM audit_events
       WHERE entity = ? AND entity_id = ?
       ORDER BY at ASC, rowid ASC
       LIMIT ? OFFSET ?
    `)
    .all(entity, entityId, limit, offset);
}

export function countAuditEvents(db, { entity, entityId }) {
  return db
    .prepare('SELECT count(*) AS n FROM audit_events WHERE entity = ? AND entity_id = ?')
    .get(entity, entityId).n;
}
