// The only file in this feature with SQL, which verify-architecture enforces.
//
// No column stores a deadline. sla_clocks keeps started_at, stopped_at and
// paused_ms (0003__service_levels.sql), and the deadline is worked out on read
// from the ticket's CURRENT priority — which is the only arrangement in which
// an escalated ticket can carry an escalated promise.
export function insertClock(db, { id, ticketId, kind, startedAt, at }) {
  return db
    .prepare(`
      INSERT INTO sla_clocks (id, ticket_id, kind, started_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(id, ticketId, kind, startedAt, at, at);
}

export function findClocksByTicket(db, { ticketId }) {
  return db
    .prepare(`
      SELECT kind, started_at, stopped_at, paused_ms
      FROM sla_clocks
      WHERE ticket_id = ? AND deleted_at IS NULL
    `)
    .all(ticketId);
}

export function findTicketPriority(db, { ticketId }) {
  return db
    .prepare('SELECT priority FROM tickets WHERE id = ? AND deleted_at IS NULL')
    .get(ticketId);
}

// The four numbers live here and nowhere else. rules.txt states them and
// verify-backlog.mjs checks that the seed agrees; a third copy inside this
// feature is exactly what produced the defect those two spent a day and a half
// disagreeing about.
export function findTargetByPriority(db, { priority }) {
  return db
    .prepare(`
      SELECT first_response_minutes, resolution_minutes
      FROM sla_targets
      WHERE priority = ? AND deleted_at IS NULL
    `)
    .get(priority);
}

// Stop a clock, once.
//
// `stopped_at IS NULL` in the WHERE is the whole guarantee: a second call
// matches no rows and changes nothing, so "once" is a property of the clock
// rather than of anything counting the events that would stop it. The caller
// reads `changes` to know whether this call was the one that did it.
export function stopClock(db, { ticketId, kind, at }) {
  return db
    .prepare(`
      UPDATE sla_clocks
         SET stopped_at = ?, updated_at = ?
       WHERE ticket_id = ? AND kind = ? AND stopped_at IS NULL
    `)
    .run(at, at, ticketId, kind).changes;
}
