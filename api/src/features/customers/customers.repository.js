import { ESCAPE_CHAR, escapeLike } from './customers.rules.js';

// The only file in this feature with SQL, which verify-architecture enforces.
//
// The engine is SQLite through node:sqlite. `LIKE '%term%'` cannot use an
// index and the table has none for this — 0001__customers.sql carries only the
// partial unique index on `email`. At this scale a scan is the honest answer,
// and adding an index the query cannot use would be theatre.
const PROJECTION = 'id, name, email, phone, created_at, updated_at';

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
