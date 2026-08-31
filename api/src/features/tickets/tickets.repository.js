// The only file in this feature with SQL, which verify-architecture enforces.
const PROJECTION = `
  id, customer_id, category_id, assignee_id, status, priority,
  subject, body, revision, resolution_note, resolved_at, channel, created_at, updated_at
`;

export function insertTicket(db, { id, customerId, categoryId, subject, body, priority, status, channel, at }) {
  // revision is not set here. The column defaults to 1 (0007__tickets_revision.sql)
  // and the row is read back afterwards, which is what picks it up.
  return db
    .prepare(`
      INSERT INTO tickets (id, customer_id, category_id, status, priority, subject, body, channel, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, customerId, categoryId, status, priority, subject, body, channel, at, at);
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
function queueFilter({ status, priority, categoryId, assigneeId, customerId }) {
  const where = ['deleted_at IS NULL'];
  const params = [];

  // Not a filter a caller may ask for — the service supplies it, and only for
  // a customer reading their own. It sits here rather than in a second query
  // so that "the desk's queue" and "my tickets" are one statement with one
  // set of joins, one pagination and one order; two would drift the first time
  // either changed.
  if (customerId !== undefined) { where.push('customer_id = ?'); params.push(customerId); }

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

// ── assignment ───────────────────────────────────────────────────────────────
//
// The revision is tested in the WHERE clause and bumped in the SET clause, and
// both of those are deliberate. Reading the row, comparing the revision in
// JavaScript and then writing is a check-then-act race that permits exactly
// the overwrite BR-5 exists to forbid — measured on this engine:
//
//   two readers both see revision 1, both pass their check, both write
//     -> {"assignee":"agent-B","revision":3}   the first write vanished
//
//   UPDATE … revision = revision + 1 WHERE id = ? AND revision = ?
//     writer A { changes: 1 } · writer B { changes: 0 }
//
// `revision = revision + 1` for the same reason: a number worked out in code
// and written back is the same race in different clothes.
// The tickets somebody still has to work on, for handing back when their
// account is disabled.
//
// `status != 'closed'` and not "open" in the narrow sense: a resolved ticket
// can be reopened by a reply within its window, and then it is somebody's
// again. Closed is the only state where the work is finished, and rewriting
// who finished it in order to tidy a queue would make the record wrong.
//
// `revision` comes back because the caller has to pass it to assignTicket:
// BR-5's guard is on every write, and a sweep is not an exception to it.
// Oldest first, so the audit rows land in an order somebody can follow.
export function findOpenTicketsAssignedTo(db, { assigneeId }) {
  return db
    .prepare(`
      SELECT id, revision, status
        FROM tickets
       WHERE assignee_id = ? AND status != 'closed' AND deleted_at IS NULL
       ORDER BY created_at ASC, rowid ASC
    `)
    .all(assigneeId);
}

export function assignTicket(db, { id, assigneeId, revision, at }) {
  return db
    .prepare(`
      UPDATE tickets
         SET assignee_id = ?, revision = revision + 1, updated_at = ?
       WHERE id = ? AND revision = ? AND deleted_at IS NULL
    `)
    .run(assigneeId, at, id, revision);
}

// The schema cannot check this and says so: 0002__tickets.sql gives
// assignee_id no foreign key, because SQLite cannot add a constraint to an
// existing table, so "assignee integrity is enforced by the service".
//
// Read from this feature, as the customer lookup above is: identity/index.js
// publishes a router and a subject resolver, so its assignee list is not
// reachable without widening another feature's surface for one caller.
// One customer's tickets, at whichever statuses the caller asks for. The set
// is a parameter because "open on the desk" is a product decision and belongs
// in the service, not here.
//
// Deliberately no filter on the CUSTOMER's deleted_at: a retired customer's
// tickets did not stop existing, and the screen that reads one by id is not
// the list that hides them.
function customerTicketsFilter({ customerId, statuses }) {
  const marks = statuses.map(() => '?').join(', ');
  return {
    where: `customer_id = ? AND status IN (${marks}) AND deleted_at IS NULL`,
    params: [customerId, ...statuses],
  };
}

export function listCustomerTickets(db, { customerId, statuses, limit, offset }) {
  const { where, params } = customerTicketsFilter({ customerId, statuses });
  // Same order as the queue — newest first, rowid breaking the tie — so a
  // ticket does not move between the two screens that show it.
  return db
    .prepare(`
      SELECT ${PROJECTION}
      FROM tickets
      WHERE ${where}
      ORDER BY created_at DESC, rowid ASC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
}

export function countCustomerTickets(db, { customerId, statuses }) {
  const { where, params } = customerTicketsFilter({ customerId, statuses });
  return db.prepare(`SELECT count(*) AS n FROM tickets WHERE ${where}`).get(...params).n;
}

// ── the categories a form offers ─────────────────────────────────────────────

const CATEGORY_PROJECTION = 'id, name, created_at, updated_at';

// The FK on tickets.category_id already keeps the row present. What it cannot
// see is deleted_at, and that is what takes a category off the list — so a
// retired one satisfies the constraint and still must not be choosable. Same
// shape as findLiveCustomerId and findLiveAssigneeId, for the same reason.
export function findLiveCategoryId(db, { categoryId }) {
  return db
    .prepare('SELECT id FROM ticket_categories WHERE id = ? AND deleted_at IS NULL')
    .get(categoryId);
}

// One predicate, both statements — the page and the count cannot disagree
// about what is being counted. Same reasoning as queueFilter above.
function categoryFilter({ q }) {
  const where = ['deleted_at IS NULL'];
  const params = [];
  if (q !== undefined) {
    where.push('name LIKE ?');
    params.push(`%${q}%`);
  }
  return { where: where.join(' AND '), params };
}

export function listCategories(db, { filters, sort, limit, offset }) {
  const { where, params } = categoryFilter(filters);
  // `sort` is one of CATEGORY_SORTS, checked in the rules layer before it
  // reaches here — it is interpolated, so nothing else may ever reach it.
  // id ASC is the tiebreaker: name is unique today, but a list whose order
  // depends on that staying true is a list that reorders itself later.
  return db
    .prepare(`
      SELECT ${CATEGORY_PROJECTION}
      FROM ticket_categories
      WHERE ${where}
      ORDER BY ${sort} ASC, id ASC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
}

export function countCategories(db, { filters }) {
  const { where, params } = categoryFilter(filters);
  return db
    .prepare(`SELECT count(*) AS n FROM ticket_categories WHERE ${where}`)
    .get(...params).n;
}

export function findLiveAssigneeId(db, { assigneeId }) {
  return db
    .prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL')
    .get(assigneeId);
}

// The third BR-5 write, and a copy for the reason the note below gives: three
// callers changing three different columns is still not a pattern, and a
// helper taking a column name would be a helper that builds SQL from a string.
export function updateTicketCategory(db, { id, categoryId, revision, at }) {
  return db
    .prepare(`
      UPDATE tickets
         SET category_id = ?, revision = revision + 1, updated_at = ?
       WHERE id = ? AND revision = ? AND deleted_at IS NULL
    `)
    .run(categoryId, at, id, revision);
}

// The second BR-5 write, and a deliberate copy of assignTicket rather than a
// shared helper: two callers is not yet a pattern, and the comment above that
// function is the one place the reasoning lives.
export function updateTicketStatus(db, { id, status, revision, at, resolutionNote }) {
  return db
    .prepare(
      // Only the resolve edge writes the note, and the CASE says so in SQL
      // rather than relying on the caller to pass the existing value back.
      // Writing it unconditionally would clobber the note on the way to
      // reopened or closed, and "the note is readable afterwards" is the
      // acceptance criterion that would then quietly stop being true.
      `UPDATE tickets
          SET status = ?,
              resolution_note = CASE WHEN ? = 'resolved' THEN ? ELSE resolution_note END,
              -- Set on the way in and cleared on the way out, in the same
              -- statement and by the same CASE reasoning as the note above it:
              -- the reopen window is measured from THIS moment, and a ticket
              -- that is no longer resolved has no resolution moment to measure
              -- from. Writing it unconditionally would leave a stale value on
              -- a reopened ticket, which the next resolve would then be
              -- compared against.
              resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END,
              revision = revision + 1,
              updated_at = ?
        WHERE id = ? AND revision = ? AND deleted_at IS NULL`,
    )
    .run(status, status, resolutionNote, status, at, at, id, revision);
}

// One live category by name.
//
// The column is COLLATE NOCASE (0002__tickets.sql:3) and there is already a
// partial unique index on it scoped to live rows — 0005__users.sql added it so
// the seed's ON CONFLICT(name) had an arbiter, with the same argument this
// story would have made: a retired category should not block a new one taking
// its name back. This story wrote a migration for it and then deleted it.
//
// So the comparison is case-insensitive without a LOWER() that would defeat
// the index, and the index is the second guard behind the service's check.
export function findLiveCategoryByName(db, { name }) {
  return db
    .prepare(`SELECT ${CATEGORY_PROJECTION} FROM ticket_categories WHERE name = ? AND deleted_at IS NULL`)
    .get(name);
}

// Any category by id, live or retired. A retired one still reads back — the
// tickets that carry it did not stop existing, which is the whole of BR-1.
export function findCategoryById(db, { id }) {
  return db
    .prepare(`SELECT ${CATEGORY_PROJECTION}, deleted_at FROM ticket_categories WHERE id = ?`)
    .get(id);
}

export function insertCategory(db, { id, name, at }) {
  db.prepare(`
    INSERT INTO ticket_categories (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, name, at, at);
  return db.prepare(`SELECT ${CATEGORY_PROJECTION} FROM ticket_categories WHERE id = ?`).get(id);
}

// Scoped to live rows: renaming a retired category would change what the
// tickets carrying it say happened, which is the thing BR-1 keeps them for.
export function renameCategory(db, { id, name, at }) {
  return db
    .prepare('UPDATE ticket_categories SET name = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
    .run(name, at, id).changes;
}

// Soft, like every removal here. The tickets that carry it keep it; the list
// the form offers stops showing it; `findLiveCategoryId` stops accepting it.
export function retireCategory(db, { id, at }) {
  return db
    .prepare('UPDATE ticket_categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
    .run(at, at, id).changes;
}
