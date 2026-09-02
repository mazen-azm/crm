import { CLOCK_KINDS } from '../service-levels/index.js';
import { STATUSES } from '../tickets/index.js';
import {
  countBreachedByKind,
  countLiveTicketsByStatus,
  countMetByKind,
} from './reports.repository.js';

// How many tickets are in each status, for an admin deciding where the desk is
// stuck.
//
// A reader and not a service: this feature owns no table and writes nothing.
// It has no audit row for the same reason the trail reader has none — a read
// is not a mutation.
//
// `_actor` is taken and not used, the way audit.read.js takes it: the role was
// decided in middleware before this ran, and re-checking it here would be a
// second place deciding one rule.
export function createQueueByStatusReader({ db }) {
  return {
    read(_actor) {
      // The shape comes from the known set, and the numbers are filled into
      // it. A query grouped over tickets can only produce rows for statuses
      // that have tickets, so building the answer the other way round would
      // silently omit every status nobody is in.
      //
      // Read from STATUSES rather than retyped, so a seventh status appears
      // here without this file being edited.
      const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
      let total = 0;

      for (const { status, count } of countLiveTicketsByStatus(db)) {
        // Every live ticket counts towards the total, in the known set or not.
        //
        // Adding inside the branch below would make "the counts add up to the
        // total" true by construction — an identity that holds just as well on
        // a report which has quietly lost half the desk. Counted this way, a
        // status the write path could not have produced makes the report
        // visibly short instead, which is the difference between a number an
        // admin can act on and one they cannot.
        total += count;
        if (Object.hasOwn(counts, status)) counts[status] = count;
      }

      return { counts, total };
    },
  };
}

// What share of promises the desk kept, per kind.
//
// The denominator is the whole story. `met = total − breached` counts every
// clock still running as met: it needs no query, it reads best on the day the
// desk opens, and it is wrong. A ticket whose deadline has not passed has not
// kept its promise — it has not broken it yet, which is a different fact and
// belongs on neither side of the fraction.
//
// So a promise is counted only once it has FINISHED, and there are two ways to
// finish: the clock stopped, or a breach was recorded against it (S-5,
// scripts/rules.txt line 24). Everything else is still in progress.
export function createPromiseShareReader({ db }) {
  return {
    read(_actor) {
      const met = Object.fromEntries(CLOCK_KINDS.map((kind) => [kind, 0]));
      const breached = Object.fromEntries(CLOCK_KINDS.map((kind) => [kind, 0]));

      // Both kinds are always present, whether or not anything happened in
      // them — the same reason queue-by-status names every status. And the
      // names are read from the service-levels feature rather than retyped, so
      // there is one place that says what a clock can be.
      for (const row of countMetByKind(db)) {
        if (Object.hasOwn(met, row.kind)) met[row.kind] = row.count;
      }
      for (const row of countBreachedByKind(db)) {
        if (Object.hasOwn(breached, row.kind)) breached[row.kind] = row.count;
      }

      const kinds = Object.fromEntries(CLOCK_KINDS.map((kind) => {
        const settled = met[kind] + breached[kind];
        return [kind, {
          met: met[kind],
          breached: breached[kind],
          settled,
          // Null, not zero. A period in which nothing finished is not a desk
          // that missed everything, and those two are the same shape once a
          // percentage has been rounded onto a screen.
          //
          // Unrounded on purpose: the counts travel beside it, so a reader can
          // check the arithmetic, and rounding here would let a displayed
          // percentage contradict the numbers next to it.
          share: settled === 0 ? null : met[kind] / settled,
        }];
      }));

      return { kinds };
    },
  };
}
