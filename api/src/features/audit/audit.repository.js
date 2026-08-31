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
// The filters an admin reads the whole trail through, as a WHERE clause and
// the values to bind.
//
// `actorId: SYSTEM_ACTOR` becomes `actor_id IS NULL` rather than a comparison
// against a value. The system genuinely does things here — an auto-close, an
// escalation — and a filter that could not express "the system" would hide
// exactly the rows nobody else can explain.
//
// A range is inclusive at both ends. The stamps are whole seconds, so an
// exclusive upper bound would silently drop everything that happened in the
// last second of the range somebody asked for.
export const SYSTEM_ACTOR = 'system';

function trailFilter({ actorId, entity, entityId, from, to }) {
  const where = [];
  const params = [];
  if (actorId === SYSTEM_ACTOR) where.push('actor_id IS NULL');
  else if (actorId !== undefined) { where.push('actor_id = ?'); params.push(actorId); }
  if (entity !== undefined) { where.push('entity = ?'); params.push(entity); }
  if (entityId !== undefined) { where.push('entity_id = ?'); params.push(entityId); }
  if (from !== undefined) { where.push('at >= ?'); params.push(from); }
  if (to !== undefined) { where.push('at <= ?'); params.push(to); }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// The whole trail, filtered. Same projection and same ordering as the
// per-ticket read below it: `at ASC, rowid ASC`, because a second-resolution
// stamp is not an order (L-19) and two rows written in the same second would
// otherwise swap between two reads.
export function listTrail(db, { limit, offset, ...filters }) {
  const { where, params } = trailFilter(filters);
  return db
    .prepare(`
      SELECT id, actor_id, entity, entity_id, verb, at, diff
        FROM audit_events
        ${where}
       ORDER BY at ASC, rowid ASC
       LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
}

export function countTrail(db, filters) {
  const { where, params } = trailFilter(filters);
  return db.prepare(`SELECT count(*) AS n FROM audit_events ${where}`).get(...params).n;
}

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
