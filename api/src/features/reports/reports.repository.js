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
