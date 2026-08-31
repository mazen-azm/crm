-- What a ticket SAYS, as opposed to what state it is in.
--
-- One table for both kinds. A public reply and an internal note are the same
-- shape — a ticket, an author, a body, a time — and differ in one column and
-- in who may read it. Two tables would be two places to add a column, and a
-- thread that mixed them would be assembled in application code from two lists
-- that have to stay in one order.
--
-- NOT customer_notes. That table belongs to the customers feature and is about
-- a person; these are about a ticket. The two look alike and answer different
-- questions.
CREATE TABLE ticket_messages (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES tickets(id),
  -- NOT NULL: every message here has somebody behind it. The audit trail
  -- allows a null actor because the system genuinely does things; nothing in
  -- this product writes a message without an author, and a nullable column
  -- would invite one.
  author_id  TEXT NOT NULL REFERENCES users(id),
  -- 'internal' is allowed from the first day so CONVERSATION-2-API needs no
  -- migration to start using it. This story's route accepts only 'public';
  -- the CHECK is the schema saying there are exactly two kinds, which is a
  -- different statement from a route's validation and worth both.
  kind       TEXT NOT NULL CHECK (kind IN ('public', 'internal')),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- A thread is always read for one ticket, oldest first.
--
-- The ORDER BY that reads it is `created_at ASC, rowid ASC`: the clock is
-- whole seconds, so two messages written in the same second share a timestamp
-- and would otherwise swap between two reads. The audit feed had exactly this
-- and solved it the same way.
--
-- rowid is NOT in the index, and cannot be — SQLite refuses to index it, which
-- this migration found out. It does not need to be: every index carries the
-- rowid as its payload, so the tiebreak is already in the entries this index
-- returns.
CREATE INDEX ticket_messages_by_ticket ON ticket_messages (ticket_id, created_at);
