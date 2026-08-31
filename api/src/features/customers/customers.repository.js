import { ESCAPE_CHAR, escapeLike } from './customers.rules.js';

// The only file in this feature with SQL, which verify-architecture enforces.
//
// The engine is SQLite through node:sqlite. `LIKE '%term%'` cannot use an
// index and the table has none for this — 0001__customers.sql carries only the
// partial unique index on `email`. At this scale a scan is the honest answer,
// and adding an index the query cannot use would be theatre.
const PROJECTION = 'id, name, email, phone, user_id, created_at, updated_at';

// Written once and shared by the page and the count. Two copies of one
// predicate drift: a fourth leg gets added to the search, the count is missed,
// and `total` starts disagreeing with `items` in a way a test that only reads
// `items` would never see.
//
// Three legs, ORed:
//   name  — LIKE is case-insensitive for ASCII and matches Arabic substrings
//           exactly (both measured). It does NOT fold أ/ا/إ; that is a known
//           limitation, named rather than solved here.
//   email — the column is COLLATE NOCASE.
//   phone — both sides stripped to digits, so '+20 100 123 4567' is found by
//           '1001234567'. Skipped when the term has no digits.
//
// The values are bound, and the term's own % and _ are escaped before binding
// with the escape character declared here — binding stops injection, it does
// not stop LIKE from treating a typed % as "match anything". This string is a
// constant in this file, not input.
const STRIPPED_PHONE = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')`;

const MATCHES = `
  deleted_at IS NULL
  AND (
    name LIKE ? ESCAPE '${ESCAPE_CHAR}'
    OR email LIKE ? ESCAPE '${ESCAPE_CHAR}'
    OR (? IS NOT NULL AND ${STRIPPED_PHONE} LIKE ?)
  )`;

const bindings = ({ term, digits }) => {
  const like = `%${escapeLike(term)}%`;
  // digits are digits: nothing in them can be a wildcard.
  const digitsLike = digits === null ? null : `%${digits}%`;
  return [like, like, digitsLike, digitsLike];
};

export function searchLiveCustomers(db, { term, digits, limit, offset }) {
  return db
    .prepare(`
      SELECT ${PROJECTION}
      FROM customers
      WHERE ${MATCHES}
      ORDER BY created_at ASC, id ASC
      LIMIT ? OFFSET ?
    `)
    .all(...bindings({ term, digits }), limit, offset);
}

export function countSearchLiveCustomers(db, { term, digits }) {
  return db
    .prepare(`SELECT count(*) AS n FROM customers WHERE ${MATCHES}`)
    .get(...bindings({ term, digits })).n;
}

export function listLiveCustomers(db, { limit, offset }) {
  return db
    .prepare(`
      SELECT ${PROJECTION}
      FROM customers
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset);
}

export function countLiveCustomers(db) {
  return db.prepare('SELECT count(*) AS n FROM customers WHERE deleted_at IS NULL').get().n;
}

// ── notes ────────────────────────────────────────────────────────────────────
const NOTE_PROJECTION = 'id, customer_id, author_id, body, created_at';

// The whole row, not `id, name`. It was the narrow pair while every caller only
// needed to know the customer existed; granting a sign-in needs the address to
// grant against and the link to refuse a second grant, and a function called
// "find the customer" quietly answering with two of its columns is how a check
// against `customer.email` reads as "they have no email" when they do.
export function findLiveCustomerById(db, { id }) {
  return db
    .prepare(`SELECT ${PROJECTION} FROM customers WHERE id = ? AND deleted_at IS NULL`)
    .get(id);
}

// A retired customer is not a missing one. The list hides them; reading a
// known id does not, because their tickets and their notes did not stop
// existing when they left.
export function findCustomerById(db, { id }) {
  return db.prepare(`SELECT ${PROJECTION} FROM customers WHERE id = ?`).get(id) ?? null;
}

export function insertCustomer(db, { id, name, email, phone, at }) {
  // No user_id written here. I-1 says a customer is not a user, and the way
  // this honours it is by writing one row here and none in `users` — a test
  // asserts that. The column exists now (0010__customers_user_id.sql) and it
  // stays null until CUSTOMERS-6-API grants a sign-in, which is a separate act
  // with its own route.
  //
  // No address either: nothing asks for it and PROJECTION does not return it,
  // so a value written here would be invisible to every reader.
  db.prepare(`
    INSERT INTO customers (id, name, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, email, phone, at, at);
  return db.prepare(`SELECT ${PROJECTION} FROM customers WHERE id = ?`).get(id);
}

// The partial unique index only covers live rows, so this asks the same
// question the index does. A soft-deleted customer does not hold their address
// against a new one, and that is deliberate.
export function findLiveCustomerByEmail(db, { email }) {
  if (email === null || email === undefined) return null;
  return db
    .prepare('SELECT id FROM customers WHERE email = ? AND deleted_at IS NULL')
    .get(email) ?? null;
}

export function insertCustomerNote(db, { id, customerId, authorId, body, createdAt }) {
  return db
    .prepare(`
      INSERT INTO customer_notes (id, customer_id, author_id, body, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, customerId, authorId, body, createdAt);
}

export function listCustomerNotes(db, { customerId, limit, offset }) {
  return db
    .prepare(`
      SELECT ${NOTE_PROJECTION}
      FROM customer_notes
      WHERE customer_id = ?
      -- rowid, never created_at: two notes written in the same second share a
      -- timestamp and the engine may then return them in any order (L-19).
      -- The customer_id index yields this ordering for free; SQLite stores the
      -- rowid as the index payload.
      ORDER BY rowid ASC
      LIMIT ? OFFSET ?
    `)
    .all(customerId, limit, offset);
}

export function countCustomerNotes(db, { customerId }) {
  return db
    .prepare('SELECT count(*) AS n FROM customer_notes WHERE customer_id = ?')
    .get(customerId).n;
}

// The link I-1 describes, set once. Scoped to live rows for the reason every
// write here is: a removed customer is kept for the trail, not for writing to.
// Which columns a contact correction may touch.
//
// Here rather than only in the service, because this function builds column
// names into SQL: a caller that passed an unexpected key would be writing the
// query, and the guard belongs where the string is assembled rather than one
// layer away from it.
const CORRECTABLE = new Set(['name', 'email', 'phone']);

// A partial contact correction. Only the columns named are written; the rest
// are left as they are, which is what makes an audit diff readable — and what
// stops a screen that sends all three from overwriting two to change one.
//
// Scoped to live rows: a deleted customer is a 404 and not an update target.
export function updateCustomerContacts(db, { id, changes, at }) {
  const columns = Object.keys(changes);
  if (columns.length === 0) return null;
  for (const column of columns) {
    if (!CORRECTABLE.has(column)) throw new Error(`not a correctable column: ${column}`);
  }

  const assignments = columns.map((column) => `${column} = ?`).join(', ');
  const written = db
    .prepare(`UPDATE customers SET ${assignments}, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
    .run(...columns.map((column) => changes[column]), at, id);
  if (written.changes === 0) return null;

  return db.prepare(`SELECT ${PROJECTION} FROM customers WHERE id = ?`).get(id);
}

// Soft, like every removal here (BR-1). The row stays, the audit rows that
// name them stay, and their tickets are untouched — the list, the search and
// the count already ask for `deleted_at IS NULL`, so hiding them costs no new
// filter and cannot be forgotten in one place and not another.
//
// Scoped to live rows, so deleting twice reports nothing changed rather than
// moving the moment it happened. The same shape retireCategory has.
export function softDeleteCustomer(db, { id, at }) {
  return db
    .prepare('UPDATE customers SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
    .run(at, at, id).changes;
}

export function setCustomerUserId(db, { customerId, userId, at }) {
  return db
    .prepare('UPDATE customers SET user_id = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
    .run(userId, at, customerId);
}
