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

export function countMessages(db, { ticketId }) {
  return db
    .prepare('SELECT count(*) AS n FROM ticket_messages WHERE ticket_id = ?')
    .get(ticketId).n;
}
