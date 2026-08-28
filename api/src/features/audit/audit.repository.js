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
