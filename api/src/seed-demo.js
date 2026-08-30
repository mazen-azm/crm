import { createTicketsService } from './features/tickets/index.js';
import { demoTickets } from './seed-demo.data.js';

// The demo queue, walked through the real state machine.
//
// It lives here, beside compose.js, and not in platform/db/seed.js, because
// "walked through the real state machine" means calling the tickets service —
// and `verify-architecture.mjs` forbids platform from knowing a feature's name
// (api-shared-platform-no-feature). compose.js is the file that is allowed to
// gather features; this is its sibling.
//
// Worth recording: the checker would NOT have stopped the other arrangement.
// Its rule names `api/src/features/`, so platform importing a root-level module
// that imports a feature passes — permitted by the letter and a layering
// inversion all the same. The composition root moved up instead of the
// dependency sneaking down.
//
// Why the walk, rather than inserting rows at their final status: a ticket
// written straight to `resolved` never had a resolution note demanded of it,
// never wrote an audit row, and never proved the transition table allows the
// path it claims to have taken. Seeding this way exercises T-4, BR-2 and BR-5
// on every run, so a demo database that builds is also evidence the rules hold.
export function seedDemo(db, { now = () => Math.floor(Date.now() / 1000), actor } = {}) {
  // Idempotence, coarsely. Tickets have no natural unique key — two tickets
  // with the same subject are two tickets — so the conflict clause that makes
  // the reference seed safe to re-run does not transfer. A queue that already
  // has rows is left alone, and the caller is told, rather than the queue
  // quietly doubling on a second `npm run seed`.
  if (db.prepare('SELECT 1 FROM tickets LIMIT 1').get()) {
    return { seeded: 0, skipped: true };
  }

  const byName = (table, column = 'name') =>
    new Map(db.prepare(`SELECT id, ${column} AS key FROM ${table} WHERE deleted_at IS NULL`).all()
      .map((row) => [row.key, row.id]));

  const customers = byName('customers');
  const categories = byName('ticket_categories');
  const staff = byName('users');

  const missing = (what, key) => {
    throw new Error(`seed-demo: no ${what} named ${JSON.stringify(key)} — the reference seed and the fixtures disagree`);
  };

  let seeded = 0;
  for (const fixture of demoTickets) {
    // The clock is a parameter. Backdating `created_at` after the fact would
    // produce a ticket that never went through the machine, and the promise
    // clocks SERVICE-LEVELS-1-API starts are read from this same `now`.
    const raisedAt = now() - fixture.raisedHoursAgo * 3600;
    const service = createTicketsService({ db, now: () => raisedAt });

    const customerId = customers.get(fixture.customer) ?? missing('customer', fixture.customer);
    const categoryId = fixture.category
      ? (categories.get(fixture.category) ?? missing('category', fixture.category))
      : null;

    let ticket = service.raise(actor, {
      customerId,
      categoryId,
      priority: fixture.priority,
      subject: fixture.subject,
      body: fixture.body,
    });

    for (const step of fixture.walk) {
      // Each move happens a little after the one before it, so the audit trail
      // reads in the order things actually happened rather than arriving in a
      // single instant.
      const at = raisedAt + (fixture.walk.indexOf(step) + 1) * 900;
      const moving = createTicketsService({ db, now: () => at });

      if (step.move === 'assign') {
        const assigneeId = staff.get(step.to) ?? missing('staff member', step.to);
        ticket = moving.assign(actor, { id: ticket.id, assigneeId, revision: ticket.revision });
      } else {
        ticket = moving.changeStatus(actor, {
          id: ticket.id,
          status: step.to,
          revision: ticket.revision,
          note: step.note,
        });
      }
    }

    seeded += 1;
  }

  return { seeded, skipped: false };
}
