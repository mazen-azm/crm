// Live tickets grouped by status.
//
// The query returns a row only for a status that has at least one ticket —
// that is what GROUP BY does, and it is exactly why the zero-fill cannot live
// here. A report whose empty statuses are missing reads as a report with
// nothing wrong in it, and `pending: 0` is the number that says the desk is
// not stalling anybody.
//
// `deleted_at IS NULL` is what keeps this report agreeing with the queue
// (BR-1). Without it the two screens answer the same question differently and
// nothing says which is right.
export function countLiveTicketsByStatus(db) {
  return db
    .prepare(`
      SELECT status, count(*) AS n
      FROM tickets
      WHERE deleted_at IS NULL
      GROUP BY status
    `)
    .all()
    .map((row) => ({ status: row.status, count: row.n }));
}

// How the two promises finished, per kind.
//
// Two queries rather than one, because they count different things: a breach is
// a stored row (S-5, scripts/rules.txt line 24) and a met promise is a clock
// that stopped without one. Neither compares a deadline to the time — that is
// the read path's job on a ticket, and a report that did its own arithmetic
// would disagree with the queue every time the sweep was behind, with nothing
// to say which of the two was lying.
//
// `deleted_at IS NULL` three times over: on the breach, on the clock, and on
// the ticket the clock belongs to. Every other query on these tables filters
// the first two; the third is the one a report has to add for itself, and
// without it the desk is scored on tickets that no longer exist.
export function countBreachedByKind(db) {
  return db
    .prepare(`
      SELECT b.kind, count(*) AS n
        FROM sla_breaches b
        JOIN tickets t ON t.id = b.ticket_id AND t.deleted_at IS NULL
       WHERE b.deleted_at IS NULL
       GROUP BY b.kind
    `)
    .all()
    .map((row) => ({ kind: row.kind, count: row.n }));
}

// A promise kept: the clock stopped and nothing recorded a breach against it.
//
// The LEFT JOIN is what makes this "met" rather than "stopped" — a clock can
// stop after it has already broken its promise, and counting that as met is
// the flattering answer.
export function countMetByKind(db) {
  return db
    .prepare(`
      SELECT c.kind, count(*) AS n
        FROM sla_clocks c
        JOIN tickets t ON t.id = c.ticket_id AND t.deleted_at IS NULL
        LEFT JOIN sla_breaches b
          ON b.ticket_id = c.ticket_id AND b.kind = c.kind AND b.deleted_at IS NULL
       WHERE c.deleted_at IS NULL
         AND c.stopped_at IS NOT NULL
         AND b.ticket_id IS NULL
       GROUP BY c.kind
    `)
    .all()
    .map((row) => ({ kind: row.kind, count: row.n }));
}
