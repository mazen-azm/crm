CREATE TABLE sla_targets (
  id                       TEXT PRIMARY KEY,
  priority                 TEXT NOT NULL UNIQUE,   -- low|normal|high|urgent
  first_response_minutes   INTEGER NOT NULL,
  resolution_minutes       INTEGER NOT NULL,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL,
  deleted_at               TEXT
);

CREATE TABLE sla_clocks (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES tickets(id),
  kind       TEXT NOT NULL,           -- first_response|resolution (S-1)
  started_at TEXT NOT NULL,
  stopped_at TEXT,
  paused_ms  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (ticket_id, kind)
);

CREATE TABLE sla_breaches (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES tickets(id),
  kind       TEXT NOT NULL,           -- first_response|resolution
  breached_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  -- Criterion at scripts/criteria/platform.md lines 34-35: a second insert of
  -- the same (ticket, kind) is refused by a unique constraint.
  UNIQUE (ticket_id, kind)
);

CREATE TABLE escalations (
  id         TEXT PRIMARY KEY,
  breach_id  TEXT NOT NULL REFERENCES sla_breaches(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  -- Criterion at scripts/criteria/platform.md lines 36-37: the same breach
  -- escalated twice is refused by a unique constraint. Matches S-6 in
  -- scripts/rules.txt line 25 ("... notifies an admin exactly once,
  -- enforced by a constraint").
  UNIQUE (breach_id)
);
