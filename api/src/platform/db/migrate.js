import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from '../config/index.js';
import { openDatabase } from './connection.js';

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');

// The runner owns its own ledger table — no migration file records it, so
// numbering starts at 0001. "if not exists" makes the bootstrap itself
// re-runnable; one transaction so a crash mid-create leaves nothing behind.
function ensureLedger(db) {
  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function pendingFiles(db) {
  const applied = new Set(
    db.prepare('SELECT id FROM schema_migrations').all().map((row) => row.id),
  );
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ id: name.slice(0, -'.sql'.length), name }))
    .filter((file) => !applied.has(file.id));
}

// Idempotent: every applied file is recorded by id, and a recorded id is never
// re-run. Each file is one transaction — it lands whole or not at all, and a
// failure rethrows with the filename so the log says which file broke.
export function runMigrations(db) {
  ensureLedger(db);

  let applied = 0;
  for (const file of pendingFiles(db)) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file.name), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(
        file.id,
        new Date().toISOString(),
      );
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`migration ${file.name} failed: ${err.message}`, { cause: err });
    }
    applied += 1;
  }

  const total = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n;
  return { applied, skipped: total - applied };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`migrating ${config.dbPath}`);
  const db = openDatabase(config.dbPath);
  try {
    const { applied, skipped } = runMigrations(db);
    console.log(`applied ${applied} migration(s), skipped ${skipped}`);
  } finally {
    db.close();
  }
}
