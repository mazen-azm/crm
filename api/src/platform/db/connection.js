import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// A factory, not a singleton. app.js (a later story) is the composition root and
// decides how many connections exist and when they close; this module only knows
// how to open one correctly.
//
// Every connection turns foreign keys ON — SQLite defaults them OFF per
// connection, so a REFERENCES clause is inert until this runs. WAL is set for
// file-backed databases only; :memory: has no journal file to switch.
export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    // node:sqlite opens, it does not create the parent directory. On a fresh
    // clone `data/` does not exist (it is gitignored), so make it first.
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  return db;
}
