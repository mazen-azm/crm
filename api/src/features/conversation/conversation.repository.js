// The only file in this feature with SQL, which verify-architecture enforces.
const PROJECTION = 'id, ticket_id, author_id, kind, body, created_at';

const publicShape = (row) => ({
  id: row.id,
  ticketId: row.ticket_id,
  authorId: row.author_id,
  // Which kind it is travels with the message. A reader entitled to see both
  // needs to tell them apart, and a screen deciding by position or by author
  // would be reconstructing a fact the row already holds.
  kind: row.kind,
  body: row.body,
  createdAt: row.created_at,
});

export function insertMessage(db, { id, ticketId, authorId, kind, body, at }) {
  db.prepare(`
    INSERT INTO ticket_messages (id, ticket_id, author_id, kind, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, ticketId, authorId, kind, body, at);
  return publicShape(db.prepare(`SELECT ${PROJECTION} FROM ticket_messages WHERE id = ?`).get(id));
}

// The thread, for a reader who may see everything or only the public half.
//
// One query with a predicate rather than two functions: the ORDER BY, the
// projection and the window are the same question asked of a different set,
// and two copies of them would answer it differently the first time one
// changed.
//
// `created_at ASC, rowid ASC` — the clock is whole seconds, so two messages
// written in the same second share a timestamp and would otherwise swap
// between two reads. The audit feed had exactly this.
const PUBLIC_ONLY = "AND kind = 'public'";

export function listMessages(db, { ticketId, publicOnly, limit, offset }) {
  return db
    .prepare(`
      SELECT ${PROJECTION}
        FROM ticket_messages
       WHERE ticket_id = ? ${publicOnly ? PUBLIC_ONLY : ''}
       ORDER BY created_at ASC, rowid ASC
       LIMIT ? OFFSET ?
    `)
    .all(ticketId, limit, offset)
    .map(publicShape);
}

// The count obeys the same predicate as the list, and that is the rule rather
// than a tidiness: a total that included notes would tell a customer how many
// there are, which is the leak wearing a number.
export function countMessages(db, { ticketId, publicOnly }) {
  return db
    .prepare(`SELECT count(*) AS n FROM ticket_messages WHERE ticket_id = ? ${publicOnly ? PUBLIC_ONLY : ''}`)
    .get(ticketId).n;
}
