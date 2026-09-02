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

// Load per live staff member.
//
// The rows come from `users`, not from `tickets`, and that is the whole story.
// A `GROUP BY tickets.assignee_id` can only return people who hold something —
// and the person an admin opened this report to find is the one holding
// nothing. The LEFT JOIN puts a zero where nothing joins.
//
// Live staff: `users.deleted_at IS NULL` and a role that can hold work. A
// disabled account cannot take any, and a customer never holds a ticket.
//
// The status filter sits in the JOIN and not in the WHERE, deliberately: in
// the WHERE it would drop the person as well as their finished tickets, and an
// agent whose queue is empty because they cleared it would vanish from the
// report for having done the work.
//
// `u.id` after the name: two people sharing a name would otherwise swap places
// between two reads of the same data (L-19).
export function countAssignedLoadByUser(db, { staffRoles, offThePlate }) {
  if (staffRoles.length === 0 || offThePlate.length === 0) return [];
  const roles = staffRoles.map(() => '?').join(', ');
  const statuses = offThePlate.map(() => '?').join(', ');
  return db
    .prepare(`
      SELECT u.id AS id, u.name AS name, u.role AS role, count(t.id) AS n
        FROM users u
        LEFT JOIN tickets t
          ON t.assignee_id = u.id
         AND t.deleted_at IS NULL
         AND t.status NOT IN (${statuses})
       WHERE u.deleted_at IS NULL
         AND u.role IN (${roles})
       GROUP BY u.id
       ORDER BY u.name COLLATE NOCASE, u.id
    `)
    .all(...offThePlate, ...staffRoles)
    // No email. The assignee picker leaves it out on purpose
    // (identity.service.js:45-53) — "every field that travels is a field that
    // has to keep being safe" — and a load report needs a name and a number.
    .map((row) => ({ id: row.id, name: row.name, role: row.role, load: row.n }));
}

// Work nobody has taken. Its own figure, never a row in the list of people:
// a name among the names is a person, and "nobody" is not one. It is also the
// number an admin most needs to see, which is why folding it into a row is how
// it goes unnoticed.
export function countUnassignedLoad(db, { offThePlate }) {
  if (offThePlate.length === 0) return 0;
  const statuses = offThePlate.map(() => '?').join(', ');
  return db
    .prepare(`
      SELECT count(*) AS n
        FROM tickets
       WHERE deleted_at IS NULL
         AND assignee_id IS NULL
         AND status NOT IN (${statuses})
    `)
    .get(...offThePlate).n;
}

// Every ticket still on somebody's plate, whoever's it is.
//
// It exists so the parts can be checked against the whole. The agent rows
// cover live staff and the unassigned figure covers a null assignee, which
// leaves a gap: a ticket assigned to an account that has since been disabled
// is in neither. IDENTITY-9-API hands those back on disable so it should not
// arise — and "should not arise" is what was said about the account projection
// that reported every disabled row as live, and about the out-of-set status in
// queue-by-status. Both times the check cost one query.
export function countOpenTickets(db, { offThePlate }) {
  if (offThePlate.length === 0) return 0;
  const statuses = offThePlate.map(() => '?').join(', ');
  return db
    .prepare(`
      SELECT count(*) AS n
        FROM tickets
       WHERE deleted_at IS NULL
         AND status NOT IN (${statuses})
    `)
    .get(...offThePlate).n;
}
