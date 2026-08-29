// The only file in this feature with SQL, which verify-architecture enforces.
const PROJECTION = `
  id, customer_id, category_id, assignee_id, status, priority,
  subject, body, revision, created_at, updated_at
`;

export function insertTicket(db, { id, customerId, categoryId, subject, body, priority, status, at }) {
  // revision is not set here. The column defaults to 1 (0007__tickets_revision.sql)
  // and the row is read back afterwards, which is what picks it up.
  return db
    .prepare(`
      INSERT INTO tickets (id, customer_id, category_id, status, priority, subject, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, customerId, categoryId, status, priority, subject, body, at, at);
}

export function findTicketById(db, { id }) {
  return db
    .prepare(`SELECT ${PROJECTION} FROM tickets WHERE id = ? AND deleted_at IS NULL`)
    .get(id);
}

// This feature reads the customers table itself rather than importing the
// customers repository, which verify-architecture refuses — a feature reaches
// another only through its index.js, and customers/index.js publishes a router
// and a service, not this. Widening that surface for one caller would be the
// worse trade; the two features are already joined at the schema by
// tickets.customer_id REFERENCES customers(id). The rule is about imports, not
// about which table a query names.
export function findLiveCustomerId(db, { customerId }) {
  return db
    .prepare('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL')
    .get(customerId);
}

// ── the queue ────────────────────────────────────────────────────────────────
//
// 0002__tickets.sql carries four partial indexes for exactly this read, each
// (column, created_at DESC) WHERE deleted_at IS NULL. Measured on that schema:
//
//   one filter                    SEARCH … USING INDEX tickets_status_created_at_idx
//   two filters                   SEARCH … USING INDEX tickets_priority_created_at_idx
//                                 (SQLite uses one index and tests the rest — ordinary,
//                                  not a defect)
//   assignee_id IS NULL           SEARCH … USING INDEX tickets_assignee_created_at_idx
//   NO filter                     SCAN … | USE TEMP B-TREE FOR ORDER BY
//
// That last line is the commonest read — an agent opening the desk — and it
// sorts, because none of the four is (created_at DESC) alone. At this scale
// that is fine, and a fifth index belongs to a story with evidence of need
// rather than to one that noticed a query plan. The fact is recorded here so
// the next reader inherits it.
//
// The tiebreaker is rowid, and that was measured too:
//
//   ORDER BY created_at DESC              index seek
//   ORDER BY created_at DESC, id ASC      index seek | USE TEMP B-TREE FOR LAST TERM
//   ORDER BY created_at DESC, rowid ASC   index seek
//
// id is a random UUID so ordering by it costs a sort; rowid is the index's own
// payload, so it is free — and it means insertion order, which is what a
// tiebreaker is for when two tickets share a second (L-19).
//
// ASC and not DESC, which is a trade and not an oversight:
//
//   ORDER BY created_at DESC, rowid ASC    index seek
//   ORDER BY created_at DESC, rowid DESC   index seek | USE TEMP B-TREE FOR LAST TERM
//
// A SQLite index orders equal keys by ascending rowid, so ASC is the order the
// index already has and DESC means re-sorting every page of every filtered
// query. The cost of that is real; what it buys is cosmetic. The tiebreaker
// exists so a ticket cannot move between page one and page two, and both
// directions do that equally — the only difference is that several tickets
// raised inside one second read oldest-first while the queue around them reads
// newest-first. Deterministic either way, and paying a sort on every page for
// the tidier of two arbitrary orders is not a trade worth making.

// One predicate, two statements. Copying the WHERE fragment into the page query
// and the count is how they drift: a fifth filter is added to one, missed in
// the other, and `total` starts disagreeing with `items` in a way a test that
// reads only `items` never sees (the CRM-55 lesson).
function queueFilter({ status, priority, categoryId, assigneeId }) {
  const where = ['deleted_at IS NULL'];
  const params = [];

  if (status !== undefined) { where.push('status = ?'); params.push(status); }
  if (priority !== undefined) { where.push('priority = ?'); params.push(priority); }
  if (categoryId !== undefined) { where.push('category_id = ?'); params.push(categoryId); }
  if (assigneeId === null) where.push('assignee_id IS NULL');
  else if (assigneeId !== undefined) { where.push('assignee_id = ?'); params.push(assigneeId); }

  return { where: where.join(' AND '), params };
}

export function listTickets(db, { filters, sort, limit, offset }) {
  const { where, params } = queueFilter(filters);
  // `sort` is one of SORTS, checked by the rules layer before it arrives — it
  // is a column name and cannot be bound, so nothing else may reach here.
  return db
    .prepare(`
      SELECT ${PROJECTION}
      FROM tickets
      WHERE ${where}
      ORDER BY ${sort} DESC, rowid ASC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
}

export function countTickets(db, { filters }) {
  const { where, params } = queueFilter(filters);
  return db.prepare(`SELECT count(*) AS n FROM tickets WHERE ${where}`).get(...params).n;
}
