import { STATUSES } from '../tickets/index.js';
import { countLiveTicketsByStatus } from './reports.repository.js';

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
