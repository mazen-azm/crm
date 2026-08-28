CREATE TABLE audit_events (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT,           -- NULL when the actor is the system
  entity     TEXT NOT NULL,  -- e.g. 'customer', 'ticket'
  entity_id  TEXT NOT NULL,
  verb       TEXT NOT NULL,
  at         TEXT NOT NULL,
  diff       TEXT NOT NULL   -- JSON serialised in application code (SQLite has no JSONB)
  -- NO deleted_at: BR-1 protects the audit row. NO updated_at: audit rows are immutable.
);

CREATE INDEX audit_events_entity_at_idx
  ON audit_events(entity, entity_id, at DESC);
