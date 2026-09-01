import { randomUUID } from 'node:crypto';

import { createAuditWriter, transact } from '../audit/index.js';

import {
  findClocksByTicket,
  findTargetByPriority,
  findTicketPriority,
  insertClock,
  claimEscalation,
  findBreach,
  findBreachesByTicket,
  findBreachesForTickets,
  findRunningClocks,
  insertBreach,
  pauseClock as pauseClockRow,
  resumeClock as resumeClockRow,
  stopClock as stopClockRow,
} from './service-levels.repository.js';

// The two clocks, spelled the way the column stores them
// (0003__service_levels.sql:14). The brief calls the first one "response" in
// prose; the column says first_response, and the column wins.
export const CLOCK_KINDS = Object.freeze(['first_response', 'resolution']);

// Why a deadline is worked out on read rather than written down once:
//
// A ticket raised `low` has 168 hours to be resolved. Escalate it to `urgent`
// two days later and its resolution deadline becomes creation + 4h — already
// past. That looks like a bug the first time you meet it, and it is not. It is
// the literal reading of S-1 ("two clocks from creation") with S-2 ("targets by
// priority"), and it is what S-6 leans on when a breach raises a priority a
// level. The alternative — freezing the promise at the priority a ticket
// happened to be raised with — would leave an urgent ticket carrying a
// week-long deadline, which is the opposite of what urgent means.
//
// Nothing here writes to sla_breaches. A passed deadline is reported; a breach
// is a stored row that SERVICE-LEVELS-3-API writes, never a value recomputed on
// read (S-5).
// When a promise falls due, in milliseconds.
//
// ONE expression, used by the read and by the sweep. Two would be two answers
// to "when was this due" — and S-5 says a breach is a stored fact precisely so
// that nobody has to ask twice and get different numbers.
//
// The pauses count: the accrued total, plus the one still open. A ticket
// waiting on the customer is not late while it waits (S-4), and the sweep must
// agree with the queue about that or it would record breaches the screen does
// not show.
export function deadlineMsFor(clock, minutes, nowMs) {
  const openPauseMs = clock.pause_started_at === null || clock.pause_started_at === undefined
    ? 0
    : nowMs - Date.parse(clock.pause_started_at);
  const pausedMs = (clock.paused_ms ?? 0) + openPauseMs;
  return { deadlineMs: Date.parse(clock.started_at) + minutes * 60_000 + pausedMs, pausedMs };
}

// One level up, and no further. `urgent` has nothing above it — the criteria
// say the notification still goes, because a rule that silently did nothing
// for the most urgent tickets would be worst exactly where it matters most.
const LADDER = ['low', 'normal', 'high', 'urgent'];
export const nextPriorityUp = (priority) =>
  LADDER[Math.min(LADDER.indexOf(priority) + 1, LADDER.length - 1)] ?? priority;

export function createServiceLevels({ db, now = () => Math.floor(Date.now() / 1000) }) {
  // Handed over by compose once the features this one needs exist. Not
  // constructor arguments, because tickets holds THIS service and cannot also
  // be constructed before it — a knot that a circular import would hide rather
  // than solve.
  //
  // Undefined until compose says otherwise, and every use is optional: the
  // clocks work without any of them, which is what SERVICE-LEVELS-1-API and -2
  // already relied on and what keeps their tests constructing this with a db
  // alone.
  let tickets;
  let identity;
  let notifications;
  const stamp = () => new Date(now() * 1000).toISOString();
  const audit = createAuditWriter({ db });

  // Raise it, tell them, once.
  //
  // The claim comes first and decides everything after it. `escalations` has
  // UNIQUE (breach_id), so two sweeps racing both find no escalation, both
  // attempt the insert, and the database picks one — which is what "enforced
  // by a constraint" means and what a SELECT-then-INSERT could not promise.
  const collaborators = (given) => {
    tickets = given.tickets;
    identity = given.identity;
    notifications = given.notifications;
  };

  const escalate = (ticketId, at) => {
    const breach = findBreach(db, { ticketId, kind: 'resolution' });
    if (!breach) return false;
    if (claimEscalation(db, { id: randomUUID(), breachId: breach.id, at }) === 0) return false;

    // Through the tickets feature, not by writing the column here: the
    // priority is its table's, the deadlines follow the new priority because
    // SERVICE-LEVELS-1-API reads it live, and BR-2 gets its row from the
    // writer that already knows how to record one.
    tickets?.raisePriority?.({ ticketId, to: nextPriorityUp(currentPriority(ticketId)), at });

    // Every admin on the roster. None is not an error: notifying nobody is a
    // fact about the roster, not a failure of the rule.
    notifications?.escalated?.(null, { ticketId, userIds: identity?.adminIds?.() ?? [], at });
    return true;
  };

  const currentPriority = (ticketId) => findTicketPriority(db, { ticketId })?.priority ?? 'low';

  return {
    collaborators,

    // Called by the tickets feature inside the same transaction that creates
    // the ticket. A second call for one ticket throws, and is meant to: the
    // unique constraint on (ticket_id, kind) is the guarantee that exactly one
    // of each kind exists, and catching it here would quietly turn that into
    // "duplicates are ignored" — a weaker promise in the same words. Nothing
    // retries this; a second call is a bug in the caller.
    startClocks({ ticketId, startedAt }) {
      const at = stamp();
      return CLOCK_KINDS.map((kind) => {
        const id = randomUUID();
        insertClock(db, { id, ticketId, kind, startedAt, at });
        return { id, kind, startedAt };
      });
    },

    // S-4: the resolution clock stops counting while a ticket waits on the
    // customer.
    //
    // The RESOLUTION clock only. Pending means waiting on the customer, which
    // can only happen after somebody answered them — a promise about answering
    // that could be paused by the answer is not a promise, and S-4 names the
    // resolution clock and means it.
    //
    // From inside the caller's transaction, like stopClock beside it: the
    // status move and the pause commit together or not at all.
    pause({ ticketId, at }) {
      return pauseClockRow(db, { ticketId, kind: 'resolution', at }) === 1;
    },

    // And starts again, adding what the pause cost.
    //
    // Called on the way out of `pending` — to open, to resolved, to anywhere.
    // A ticket resolved while still pending closes its pause first, or the
    // resolution would be recorded as slower than it was, which is the
    // opposite of what S-4 is for.
    resume({ ticketId, at }) {
      return resumeClockRow(db, { ticketId, kind: 'resolution', at }) === 1;
    },

    // S-5: record every deadline that has passed, as a fact.
    //
    // A route an operator or a cron calls, the shape TICKETS-14-API
    // established — there is no scheduler here and none is added. Evaluating
    // on read was refused there and is refused here for a second reason: S-5
    // says a breach is STORED and never recomputed, and a read that wrote one
    // would be recomputing it every time somebody looked.
    //
    // One transaction per row, so a ticket that cannot be written does not
    // undo the rest. The sweep is a series of independent facts.
    sweepBreaches() {
      const at = stamp();
      const nowMs = now() * 1000;
      const recorded = [];

      for (const clock of findRunningClocks(db)) {
        const minutes = clock.kind === 'first_response'
          ? clock.first_response_minutes
          : clock.resolution_minutes;
        const { deadlineMs } = deadlineMsFor(clock, minutes, nowMs);
        if (nowMs < deadlineMs) continue;

        transact(db, () => {
          // The moment it was missed, not the moment the sweep noticed. A
          // breach stamped with the sweep's own time would make every breach
          // look like it happened when somebody last ran a cron.
          const changes = insertBreach(db, {
            id: randomUUID(),
            ticketId: clock.ticket_id,
            kind: clock.kind,
            breachedAt: new Date(deadlineMs).toISOString(),
            at,
          });
          // Nothing written means the constraint refused a second one. Not an
          // error: two sweeps overlapping is ordinary, and this is the
          // constraint doing the job a SELECT would have raced on.
          if (changes === 0) return;

          audit.record(null, {
            entity: 'ticket',
            entityId: clock.ticket_id,
            verb: 'sla.breach',
            before: null,
            after: { kind: clock.kind, breachedAt: new Date(deadlineMs).toISOString() },
            at,
          });

          recorded.push({ ticketId: clock.ticket_id, kind: clock.kind });
        });

        // S-6: a missed RESOLUTION deadline raises the ticket and tells the
        // admins, once.
        //
        // After the breach and OUTSIDE the branch that asks whether this sweep
        // recorded it, deliberately. A breach recorded by an earlier sweep
        // that died before escalating would otherwise never be escalated by
        // any later one — the next sweep finds the breach already there and
        // moves on, and the ticket stays marked late with nobody told.
        //
        // So every sweep offers to escalate every resolution breach it sees,
        // and the unique constraint on `escalations.breach_id` decides. That
        // is what "enforced by a constraint" buys: the work is idempotent
        // because the database says so, not because the caller kept count.
        if (clock.kind === 'resolution') transact(db, () => escalate(clock.ticket_id, at));
      }

      return { recorded: recorded.length, at };
    },

    // The breaches on one ticket, read rather than worked out (S-5).
    breachesFor({ ticketId }) {
      return findBreachesByTicket(db, { ticketId }).map((row) => ({
        kind: row.kind,
        breachedAt: row.breached_at,
      }));
    },

    // And for a page of tickets at once — a queue of twenty-five rows is one
    // query rather than twenty-five.
    breachesForMany({ ticketIds }) {
      const byTicket = new Map(ticketIds.map((id) => [id, []]));
      for (const row of findBreachesForTickets(db, { ticketIds })) {
        byTicket.get(row.ticket_id)?.push({ kind: row.kind, breachedAt: row.breached_at });
      }
      return byTicket;
    },

    // Stop a clock, from inside the CALLER's transaction.
    //
    // It opens none of its own, deliberately: the message that stops a clock
    // and the stop itself must commit together, and SQLite refuses a
    // transaction inside a transaction. Same shape as identity's makeUser,
    // which exists for the same reason.
    //
    // Answers whether THIS call stopped it. A second one changes nothing —
    // `stopped_at IS NULL` in the WHERE is what makes "once" a property of the
    // clock rather than of counting the things that would stop it.
    stopClock({ ticketId, kind, at }) {
      if (!CLOCK_KINDS.includes(kind)) throw new Error(`unknown clock kind "${kind}"`);
      return stopClockRow(db, { ticketId, kind, at }) === 1;
    },

    // null when there is no such live ticket — the caller decides whether that
    // is a 404. This feature has no route and answers no status codes.
    readDeadlines({ ticketId }) {
      const ticket = findTicketPriority(db, { ticketId });
      if (!ticket) return null;

      const target = findTargetByPriority(db, { priority: ticket.priority });
      // A ticket whose priority has no target means the seed and the tickets
      // feature disagree about what a priority is. Louder than a wrong number.
      if (!target) throw new Error(`no SLA target for priority "${ticket.priority}"`);

      const clocks = new Map(findClocksByTicket(db, { ticketId }).map((c) => [c.kind, c]));
      const minutes = {
        first_response: target.first_response_minutes,
        resolution: target.resolution_minutes,
      };

      const nowMs = now() * 1000;
      const out = {};
      for (const kind of CLOCK_KINDS) {
        const clock = clocks.get(kind);
        // startClocks runs at creation. A missing clock is not something to
        // paper over by inserting one now — it would be a clock that started
        // whenever the gap was noticed.
        if (!clock) throw new Error(`ticket ${ticketId} has no ${kind} clock`);

        // The accrued pauses, plus the one still open if there is one.
        //
        // The open pause matters more than the closed ones: a ticket sitting
        // in `pending` for a week has nothing added yet, and a deadline that
        // ignored it would report the ticket overdue for exactly as long as it
        // waits on the customer. That is the common case — somebody looks at
        // the queue WHILE it is waiting — and it is what S-4 forbids.
        //
        // first_response has no pause and never will; `paused_ms` is 0 on that
        // row, so this is one expression rather than a branch.
        const { deadlineMs, pausedMs } = deadlineMsFor(clock, minutes[kind], nowMs);
        out[kind] = {
          startedAt: clock.started_at,
          stoppedAt: clock.stopped_at ?? null,
          // What the promise has been paused for, so a screen can say why a
          // deadline moved rather than leaving somebody to wonder.
          pausedMs,
          deadline: new Date(deadlineMs).toISOString(),
          // A stopped clock is not overdue: it was answered, whenever that was.
          overdue: clock.stopped_at === null && nowMs >= deadlineMs,
        };
      }
      return out;
    },
  };
}
