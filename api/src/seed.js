import { config } from './platform/config/index.js';
import { openDatabase } from './platform/db/connection.js';
import { seed } from './platform/db/seed.js';
import { seedDemo } from './seed-demo.js';

// `npm run seed`, in one place.
//
// It moved up here from platform/db/seed.js because the demo half has to call
// the tickets service to walk a ticket through the real state machine, and
// platform may not know a feature's name. The entry point is the composition
// root: it gathers the reference seed (which stays feature-free) and the demo
// seed (which is allowed to name a feature, like compose.js beside it).
//
// The reference seed is still importable on its own, and every test that wants
// a database without a demo queue keeps using it directly — which is most of
// them, because seven seeded tickets would make an assertion about "the
// tickets table is empty" a puzzle.
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log(`seeding ${config.dbPath}`);
  const db = openDatabase(config.dbPath);
  try {
    const { adminEmail, adminPassword, adminCreated } = seed(db);

    // The demo queue is raised BY the admin the reference seed just wrote, so
    // every audit row has a real actor rather than a null one. The trail is
    // meant to answer "who did this", and "the seed" is an answer nobody can
    // follow up.
    const admin = db.prepare('SELECT id, role FROM users WHERE email = ?').get(adminEmail);
    const demo = seedDemo(db, { actor: { id: admin.id, role: admin.role } });

    console.log(`seeded ${config.dbPath}`);
    console.log(`admin email:    ${adminEmail}`);
    if (adminCreated) {
      console.log(`admin password: ${adminPassword}`);
    } else {
      // The knowledge that a re-run's password is meaningless used to live in a
      // comment, where only somebody reading the file would meet it — while the
      // person who needs it is looking at a terminal, at a line that reads like
      // an answer. Printing it cost an hour of looking for the wrong bug.
      console.log('admin password: unchanged — this account already existed.');
      console.log('                Nothing was rewritten, which is what makes a');
      console.log('                second run safe. To start over:');
      console.log('');
      console.log(`                  rm -f ${config.dbPath} ${config.dbPath}-wal ${config.dbPath}-shm`);
      console.log('                  npm run migrate && npm run seed');
      console.log('');
      // The -wal and -shm are not incidental. The database runs in WAL mode
      // (connection.js), so removing only the main file leaves a write-ahead
      // log belonging to a database that no longer exists — and the next run
      // opens a main file that is empty while a megabyte of data sits beside
      // it, unreachable. This message used to say "delete the database file",
      // and that instruction cost an evening twice: once looking for a wrong
      // password, once looking for a 500 on sign-in that was a missing users
      // table.
      console.log('                Delete all three. Removing only the first');
      console.log('                leaves a write-ahead log from a database');
      console.log('                that is gone, and the next run starts empty.');
    }

    if (demo.skipped) {
      console.log('demo queue:     unchanged — the queue already has tickets.');
    } else {
      console.log(`demo queue:     ${demo.seeded} tickets, each walked through the real state machine.`);
    }
  } finally {
    db.close();
  }
}
