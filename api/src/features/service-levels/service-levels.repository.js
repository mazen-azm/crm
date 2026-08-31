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
      SELECT kind, started_at, stopped_at, paused_ms, pause_started_at
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
// Start a pause on a clock that is running and not already paused.
//
// `pause_started_at IS NULL` in the WHERE, so entering `pending` twice without
// leaving it — which the state machine forbids, but which a second caller
// could still attempt — does not move the moment the pause began and silently
// give the time back.
//
// `stopped_at IS NULL` too: a clock that has already been answered has nothing
// left to pause.
export function pauseClock(db, { ticketId, kind, at }) {
  return db
    .prepare(`
      UPDATE sla_clocks
         SET pause_started_at = ?, updated_at = ?
       WHERE ticket_id = ? AND kind = ?
         AND pause_started_at IS NULL AND stopped_at IS NULL AND deleted_at IS NULL
    `)
    .run(at, at, ticketId, kind).changes;
}

// Close the open pause and ADD it to the total.
//
// The addition is done in SQL rather than read-modify-write in application
// code, for the reason `revision = revision + 1` is: a number worked out in
// JavaScript and written back is a lost update wearing different clothes.
//
// A second visit accumulates rather than replacing — the column is a total,
// and a resume that overwrote it would hand back every earlier pause.
//
// `strftime('%s')` and not `julianday`. julianday returns a float and its
// product with 86400000 is not exact: thirty seconds came back as 29999 ms,
// which is a promise about time made a millisecond short by a rounding error,
// once per pause, in whichever direction the float happens to fall. Whole
// seconds multiplied by a thousand is integer arithmetic, and every stamp this
// application writes is a whole second — `new Date(now() * 1000)`, always
// ending `.000Z`.
export function resumeClock(db, { ticketId, kind, at }) {
  return db
    .prepare(`
      UPDATE sla_clocks
         SET paused_ms = paused_ms
             + (strftime('%s', ?) - strftime('%s', pause_started_at)) * 1000,
             pause_started_at = NULL,
             updated_at = ?
       WHERE ticket_id = ? AND kind = ?
         AND pause_started_at IS NOT NULL AND deleted_at IS NULL
    `)
    .run(at, at, ticketId, kind).changes;
}

export function stopClock(db, { ticketId, kind, at }) {
  return db
    .prepare(`
      UPDATE sla_clocks
         SET stopped_at = ?, updated_at = ?
       WHERE ticket_id = ? AND kind = ? AND stopped_at IS NULL
    `)
    .run(at, at, ticketId, kind).changes;
}
