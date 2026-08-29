-- An internal note an agent writes ABOUT A CUSTOMER. Not a note on a ticket.
--
-- CONVERSATION-2-API owns notes inside a ticket's thread, it carries rule SC-2
-- ("my internal note never reaches a customer, in any response"), and it has
-- neither a table nor written criteria yet. A shared `notes` table serving both
-- would be designing against requirements nobody has written, for a story whose
-- rules differ. If that story later wants to merge them, it can — with its
-- criteria in hand.
--
-- "Internal" is a rule, not a column. The customer portal does not exist, so
-- nothing here can leak into one; a visibility flag would be machinery for a
-- consumer that has never asked for it, and machinery like that gets mistaken
-- for a requirement later.
--
-- Notes are read in the order they were written, and that order is `rowid`,
-- never `created_at`: two notes written in the same second share a timestamp
-- and the engine is then free to return them in any order (L-19). The index
-- below gives that ordering for nothing — SQLite stores the rowid as the index
-- payload, so scanning it per customer already yields insertion order.
CREATE TABLE customer_notes (
  id          TEXT PRIMARY KEY,                    -- opaque to clients
  customer_id TEXT NOT NULL REFERENCES customers(id),  -- a note about nobody is not a note
  author_id   TEXT,                                -- NULL when the system wrote it, never invented
  body        TEXT NOT NULL,                       -- the rules layer refuses empty before this
  created_at  TEXT NOT NULL                        -- ISO-8601 UTC; see the ordering note above
  -- NO deleted_at and NO updated_at: editing and deleting a note are out of
  -- scope and have their own decisions to make (BR-1 would make a deletion a
  -- soft one). Columns for criteria nobody has written are guesses.
);

CREATE INDEX customer_notes_by_customer
  ON customer_notes (customer_id);
