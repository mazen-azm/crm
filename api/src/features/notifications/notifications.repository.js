const PROJECTION = 'id, user_id, ticket_id, kind, created_at, read_at';

const publicShape = (row) => ({
  id: row.id,
  ticketId: row.ticket_id,
  kind: row.kind,
  createdAt: row.created_at,
  // Null until read, rather than a boolean: when somebody read it is a fact
  // worth keeping, and a boolean throws it away to save a word.
  readAt: row.read_at ?? null,
});

export function insertNotification(db, { id, userId, ticketId, kind, at }) {
  db.prepare(`
    INSERT INTO notifications (id, user_id, ticket_id, kind, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, ticketId, kind, at);
  return publicShape(db.prepare(`SELECT ${PROJECTION} FROM notifications WHERE id = ?`).get(id));
}

// Mine, oldest first, and stable when two share a second — the same shape the
// ticket thread and the audit feed use, for the same reason.
export function listNotifications(db, { userId, limit, offset }) {
  return db
    .prepare(`
      SELECT ${PROJECTION}
        FROM notifications
       WHERE user_id = ?
       ORDER BY created_at ASC, rowid ASC
       LIMIT ? OFFSET ?
    `)
    .all(userId, limit, offset)
    .map(publicShape);
}

export function countNotifications(db, { userId }) {
  return db.prepare('SELECT count(*) AS n FROM notifications WHERE user_id = ?').get(userId).n;
}

// Scoped to the reader as well as the id, so somebody else's notification is
// not found rather than found-and-refused: the two answers must not be
// distinguishable, and the cheapest way to guarantee that is to ask one
// question.
export function findNotificationForUser(db, { id, userId }) {
  const row = db
    .prepare(`SELECT ${PROJECTION} FROM notifications WHERE id = ? AND user_id = ?`)
    .get(id, userId);
  return row ? publicShape(row) : null;
}

// Only while it is unread, so marking twice is not two events. The caller
// reads `changes` to know whether anything actually happened.
export function markNotificationRead(db, { id, userId, at }) {
  return db
    .prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL')
    .run(at, id, userId).changes;
}
