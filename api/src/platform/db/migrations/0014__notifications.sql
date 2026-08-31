-- What a person has not yet seen.
--
-- Not derived from the audit trail, and the difference is the whole reason
-- this table exists: the trail records what happened to a TICKET, and a
-- notification is about what a PERSON has not read. Unread is a fact about a
-- reader, and no amount of reading the trail produces it.
--
-- No copy of the subject. A subject copied at assignment time is a subject
-- that goes stale the first time somebody edits it, and the screen that shows
-- a notification can resolve an id — which is the same rule the ticket
-- history follows for actor names.
CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  -- Whose it is. NOT NULL: a notification nobody can read is a row nothing
  -- will ever clear.
  user_id    TEXT NOT NULL REFERENCES users(id),
  ticket_id  TEXT NOT NULL REFERENCES tickets(id),
  -- What happened. One word today — 'ticket.assigned' — and no CHECK, because
  -- a CHECK listing one value is a migration for the second story rather than
  -- a statement about the vocabulary. ticket_messages could name both of its
  -- kinds on the first day and did; this cannot honestly name a second yet.
  kind       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  -- Null until it is read. A separate column rather than a delete, because
  -- "I read this yesterday" is something a person may want to see again, and
  -- BR-1 says nothing here is hard-deleted anyway.
  read_at    TEXT
);

-- Read one way only: mine, oldest first. The clock is whole seconds, so two
-- notifications written in the same second share a timestamp — the ORDER BY
-- that reads this carries `rowid ASC` after `created_at`, and every SQLite
-- index carries the rowid as its payload, so the tiebreak is already in what
-- this index returns.
CREATE INDEX notifications_by_user ON notifications (user_id, created_at);
