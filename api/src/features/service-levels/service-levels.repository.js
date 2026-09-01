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

// Every clock still running, with what the deadline is computed from: the
// ticket's CURRENT priority and its target row.
//
// The deadline itself is not computed here. It is worked out in one place in
// the service — the same expression the single-ticket read uses — because two
// answers to "when was this due" is exactly the drift S-5 exists to prevent.
//
// Only live, unstopped, undeleted clocks: a stopped one was answered and a
// deleted ticket has no promise.
export function findRunningClocks(db) {
  return db
    .prepare(`
      SELECT c.ticket_id, c.kind, c.started_at, c.paused_ms, c.pause_started_at,
             t.priority,
             s.first_response_minutes, s.resolution_minutes
        FROM sla_clocks c
        JOIN tickets t ON t.id = c.ticket_id
        JOIN sla_targets s ON s.priority = t.priority
       WHERE c.stopped_at IS NULL
         AND c.deleted_at IS NULL
         AND t.deleted_at IS NULL
         AND s.deleted_at IS NULL
       ORDER BY c.ticket_id, c.kind
    `)
    .all();
}

// One breach, once. The unique constraint on (ticket_id, kind) is what makes
// it once — not a SELECT that ran first, which is a race, and not a check in
// application code, which is the same race with more steps.
//
// `INSERT OR IGNORE` so a second sweep is silent rather than an error: two
// sweeps overlapping is an operational normality, and a 500 for it would be
// the product complaining about being run twice.
export function insertBreach(db, { id, ticketId, kind, breachedAt, at }) {
  return db
    .prepare(`
      INSERT OR IGNORE INTO sla_breaches (id, ticket_id, kind, breached_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(id, ticketId, kind, breachedAt, at, at).changes;
}

// Claim the escalation for a breach.
//
// `UNIQUE (breach_id)` (0003) is what makes S-6's "exactly once" true, and
// `INSERT OR IGNORE` is how a second attempt becomes silent. The row is
// written FIRST and everything else follows from whether it was written: two
// sweeps racing both see no escalation, both try, and the database picks one.
// A check before the work would let both through.
export function claimEscalation(db, { id, breachId, at }) {
  return db
    .prepare(`
      INSERT OR IGNORE INTO escalations (id, breach_id, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(id, breachId, at, at).changes;
}

export function findBreach(db, { ticketId, kind }) {
  return db
    .prepare('SELECT id, breached_at FROM sla_breaches WHERE ticket_id = ? AND kind = ? AND deleted_at IS NULL')
    .get(ticketId, kind) ?? null;
}

// The breaches on one ticket, for a read that must not recompute them (S-5).
export function findBreachesByTicket(db, { ticketId }) {
  return db
    .prepare(`
      SELECT kind, breached_at
        FROM sla_breaches
       WHERE ticket_id = ? AND deleted_at IS NULL
       ORDER BY kind
    `)
    .all(ticketId);
}

// And for a page of them at once, so a queue of twenty-five rows is one query
// rather than twenty-five.
export function findBreachesForTickets(db, { ticketIds }) {
  if (ticketIds.length === 0) return [];
  const holes = ticketIds.map(() => '?').join(', ');
  return db
    .prepare(`
      SELECT ticket_id, kind, breached_at
        FROM sla_breaches
       WHERE ticket_id IN (${holes}) AND deleted_at IS NULL
       ORDER BY ticket_id, kind
    `)
    .all(...ticketIds);
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
