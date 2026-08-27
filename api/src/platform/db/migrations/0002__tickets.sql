CREATE TABLE ticket_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE tickets (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES customers(id),
  category_id  TEXT REFERENCES ticket_categories(id),
  assignee_id  TEXT,                       -- no FK: SQLite cannot add a constraint to an existing
                                           -- table; when identity ships, assignee integrity is
                                           -- enforced by the service, not by a rebuild
  status       TEXT NOT NULL,              -- new|open|pending|resolved|closed|reopened (T-1, enforced by service)
  priority     TEXT NOT NULL,              -- low|normal|high|urgent (T-1)
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT
);

-- The four queue indexes. Each matches one filter of the queue (TICKETS-2-WEB, TICKETS-3, TICKETS-9).
-- Partial on deleted_at IS NULL because the queue never lists soft-deleted rows.
-- ORDER BY created_at DESC is served by the trailing column in DESC direction.
CREATE INDEX tickets_status_created_at_idx
  ON tickets(status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX tickets_assignee_created_at_idx
  ON tickets(assignee_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX tickets_priority_created_at_idx
  ON tickets(priority, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX tickets_category_created_at_idx
  ON tickets(category_id, created_at DESC)
  WHERE deleted_at IS NULL;
