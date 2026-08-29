import { randomUUID } from 'node:crypto';

import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { createAuditWriter, transact } from '../audit/index.js';
import { createServiceLevels } from '../service-levels/index.js';
import {
  DEFAULT_SORT,
  UNASSIGNED,
  normaliseRaisedTicket,
  validateQueueQuery,
  validateRaisedTicket,
} from './tickets.rules.js';
import {
  countTickets,
  findLiveCustomerId,
  findTicketById,
  insertTicket,
  listTickets,
} from './tickets.repository.js';

const publicShape = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  categoryId: row.category_id,
  assigneeId: row.assignee_id,
  status: row.status,
  priority: row.priority,
  subject: row.subject,
  body: row.body,
  // BR-5's token. A caller sends it back on a write and a mismatch is 409 —
  // TICKETS-3-API and TICKETS-4-API are the writes that read it.
  revision: row.revision,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createTicketsService({ db, now = () => Math.floor(Date.now() / 1000) }) {
  const stamp = () => new Date(now() * 1000).toISOString();
  const audit = createAuditWriter({ db });
  const serviceLevels = createServiceLevels({ db, now });

  return {
    raise(actor, input) {
      // The shape check first, so nothing malformed reaches the transaction and
      // a 422 names fields rather than values.
      const invalid = validateRaisedTicket(input ?? {});
      if (invalid.length > 0) throw unprocessable(invalid);

      const { subject, body, priority, categoryId } = normaliseRaisedTicket(input);
      const id = randomUUID();
      const at = stamp();

      // One transaction: the ticket, its two clocks and the audit row land
      // together or not at all. If the audit write fails, the ticket does not
      // exist — which is BR-2 meaning something rather than being hoped for,
      // and there is a test that forces exactly that.
      //
      // Note what the audit guard does NOT do here. It refuses a COMMIT that
      // changed a table without recording it, so it catches a mutation inside a
      // transaction that forgot its audit row. It is deliberately inert outside
      // a transaction — the seed and the migration runner write there and must
      // keep working — so hoisting this whole block out of `transact` would not
      // trip it. Atomicity is the reason for the transaction; the guard is the
      // second line, not the first.
      return transact(db, () => {
        if (!findLiveCustomerId(db, { customerId: input.customerId })) {
          throw new HttpError(404, 'NOT_FOUND');
        }

        insertTicket(db, {
          id,
          customerId: input.customerId,
          categoryId,
          subject,
          body,
          priority,
          // Always new. Moving it is the state machine's job (TICKETS-4-API),
          // and there is nothing to move from yet.
          status: 'new',
          at,
        });

        // S-1: both clocks start at the ticket's creation, not at whenever
        // this line runs. Same `at` the row carries.
        serviceLevels.startClocks({ ticketId: id, startedAt: at });

        audit.record(actor, {
          entity: 'ticket',
          entityId: id,
          verb: 'ticket.create',
          before: null,
          after: { customerId: input.customerId, priority, status: 'new' },
          at,
        });

        // Read back inside the transaction: the revision was defaulted by the
        // column, so the row is the only place it exists.
        return publicShape(findTicketById(db, { id }));
      });
    },

    // The queue every agent shares. It is NOT scoped to whoever is asking:
    // "an agent sees all of it" is the story's own title, and SC-1 is one
    // organisation, one queue. `actor` arrives because the route is guarded,
    // not because it filters anything.
    //
    // A read writes no audit row.
    list(actor, { status, priority, assigneeId, categoryId, sort, limit, offset }) {
      const invalid = validateQueueQuery({ status, priority, assigneeId, categoryId, sort });
      if (invalid.length > 0) throw unprocessable(invalid);

      const filters = {};
      if (status !== undefined) filters.status = status;
      if (priority !== undefined) filters.priority = priority;
      if (categoryId !== undefined) filters.categoryId = categoryId;
      // null is how the repository spells "IS NULL"; the sentinel stops at
      // this boundary and no SQL below knows the word.
      if (assigneeId !== undefined) filters.assigneeId = assigneeId === UNASSIGNED ? null : assigneeId;

      return {
        items: listTickets(db, { filters, sort: sort ?? DEFAULT_SORT, limit, offset }).map(publicShape),
        // The matches, not the page.
        total: countTickets(db, { filters }),
        limit,
        offset,
      };
    },
  };
}
