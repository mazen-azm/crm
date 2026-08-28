// Environment, read once at module load. No dynamic re-reads: a value that can
// change under a running process is a value two code paths can disagree about.
//
// DB_PATH — where the SQLite file lives. Unset in a test run resolves to
// :memory: so the suite needs no file and no teardown; unset anywhere else
// resolves to ./data/app.db, and the migration runner logs which path it used.

const isTest = process.env.NODE_ENV === 'test';

const dbPath = process.env.DB_PATH ?? (isTest ? ':memory:' : './data/app.db');

export const config = Object.freeze({ dbPath });
