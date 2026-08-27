CREATE TABLE customers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT COLLATE NOCASE,
  phone      TEXT,
  address    TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Partial unique index: two rows can share an email once one is soft-deleted.
-- Criterion at scripts/criteria/platform.md lines 32-33.
CREATE UNIQUE INDEX customers_email_uniq
  ON customers(email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;
