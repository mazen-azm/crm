CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,     -- "salt:hash" hex, from node:crypto scrypt
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,     -- admin|agent; the enum is IDENTITY-1-API's
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);

-- Partial unique index: two rows can share an email once one is soft-deleted,
-- the same shape as customers_email_uniq in 0001__customers.sql.
CREATE UNIQUE INDEX users_email_uniq
  ON users(email)
  WHERE deleted_at IS NULL;

-- The seed reseeds categories by name; without this index its ON CONFLICT(name)
-- has no arbiter to name. Partial on deleted_at IS NULL because a retired
-- category should not block a new one taking its name back.
CREATE UNIQUE INDEX ticket_categories_name_uniq
  ON ticket_categories(name)
  WHERE deleted_at IS NULL;
