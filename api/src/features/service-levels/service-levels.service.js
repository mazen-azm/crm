import { randomUUID } from 'node:crypto';

import {
  findClocksByTicket,
  findTargetByPriority,
  findTicketPriority,
  insertClock,
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
export function createServiceLevels({ db, now = () => Math.floor(Date.now() / 1000) }) {
  const stamp = () => new Date(now() * 1000).toISOString();

  return {
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

        const deadlineMs = Date.parse(clock.started_at) + minutes[kind] * 60_000;
        out[kind] = {
          startedAt: clock.started_at,
          stoppedAt: clock.stopped_at ?? null,
          deadline: new Date(deadlineMs).toISOString(),
          // A stopped clock is not overdue: it was answered, whenever that was.
          overdue: clock.stopped_at === null && nowMs >= deadlineMs,
        };
      }
      return out;
    },
  };
}
