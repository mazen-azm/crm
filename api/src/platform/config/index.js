// Environment, read once at module load. No dynamic re-reads: a value that can
// change under a running process is a value two code paths can disagree about.
//
// DB_PATH — where the SQLite file lives. Unset in a test run resolves to
// :memory: so the suite needs no file and no teardown; unset anywhere else
// resolves to ./data/app.db, and the migration runner logs which path it used.

import { randomBytes } from 'node:crypto';

const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

const dbPath = process.env.DB_PATH ?? (isTest ? ':memory:' : './data/app.db');

// SIGN_IN_TOKEN_SECRET — signs the tokens the API issues.
//
// Production refuses to boot without one: a server that invents a secret at
// startup silently signs out every user on every restart and every second
// instance, and does it quietly.
//
// Development gets a fresh random one per process, which is honest — the
// tokens really do stop working when it restarts, and the warning says so.
// Tests get a fixed literal so a signature is reproducible across a run.
function readTokenSecret() {
  const fromEnv = process.env.SIGN_IN_TOKEN_SECRET;
  if (fromEnv) return fromEnv;
  if (isProduction) {
    throw new Error('SIGN_IN_TOKEN_SECRET is not set; the API will not start without it');
  }
  if (isTest) return 'test-sign-in-secret-do-not-use-in-production';
  console.warn('SIGN_IN_TOKEN_SECRET not set; using a random secret for this process. Tokens will not survive a restart.');
  return randomBytes(32).toString('hex');
}

export const config = Object.freeze({ dbPath, signInTokenSecret: readTokenSecret() });
