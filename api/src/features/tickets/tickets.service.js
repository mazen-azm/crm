import { randomUUID } from 'node:crypto';

import { ConflictError, HttpError, unprocessable } from '../../platform/http/errors.js';
import { countAuditEvents, createAuditWriter, listAuditEvents, transact } from '../audit/index.js';
import { createServiceLevels } from '../service-levels/index.js';
import {
  DEFAULT_CATEGORY_SORT,
  DEFAULT_SORT,
  UNASSIGNED,
  allowedFrom,
  normaliseRaisedTicket,
  validateQueueQuery,
  validateAssignment,
  validateCategoryQuery,
  validateRaisedTicket,
  validateStatusChange,
} from './tickets.rules.js';
import {
  assignTicket,
  countCategories,
  countTickets,
  findLiveCategoryId,
  findLiveAssigneeId,
  findLiveCustomerId,
  findTicketById,
  insertTicket,
  listCategories as listCategoryRows,
  listTickets,
  updateTicketStatus,
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
  // Null until the ticket is resolved. T-4 requires the note to survive being
  // read back, which is the whole reason it is a column — so it is on the
  // public shape rather than only in the audit trail.
  resolutionNote: row.resolution_note ?? null,
  // The moves that are legal from where this ticket is. Derived from the same
  // table the refusal reads, so it cannot drift from it — and it is here
  // because a client has no other way to know. Without it a screen either
  // copies the transition table into its own language, which is one product
  // rule in two places, or offers every move and lets the 409 narrow them,
  // which makes the refusal the interface rather than the backstop.
  allowedTransitions: allowedFrom(row.status),
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

        // null is a ticket with no category, which the column allows and
        // normaliseRaisedTicket produces by default — so the null test comes
        // first, exactly as it does for assigneeId when assigning.
        //
        // Without this guard the FK fires and SQLite's own error escapes as a
        // 500, which tells the caller their bad input was our fault; and a
        // retired category slips through entirely, because a foreign key can
        // see that a row exists and cannot see that it was taken off the list.
        if (categoryId !== null && !findLiveCategoryId(db, { categoryId })) {
          throw unprocessable(['categoryId']);
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

    // Everything that has happened to one ticket, oldest first.
    //
    // A read, so no audit row — reading a trail is not an event on it. The
    // rows come from the audit feature through its index, not by querying
    // audit_events from here: one table belongs to one feature, and
    // verify-architecture would be right to object.
    history(actor, { id, limit, offset }) {
      // An empty history and a missing ticket are different answers, and only
      // one of them is an error. Same 404 the writes throw.
      if (!findTicketById(db, { id })) throw new HttpError(404, 'NOT_FOUND');

      return {
        items: listAuditEvents(db, { entity: 'ticket', entityId: id, limit, offset }).map((row) => {
          // `diff` is one JSON column holding { before, after } — SQLite has no
          // JSONB, so the shape is serialised in application code. Parsed here
          // because a client parsing our storage format makes our storage
          // format the contract.
          const { before, after } = JSON.parse(row.diff);
          return { id: row.id, actorId: row.actor_id, verb: row.verb, at: row.at, before, after };
        }),
        total: countAuditEvents(db, { entity: 'ticket', entityId: id }),
        limit,
        offset,
      };
    },

    // The categories a form offers when raising a ticket. A read, so no audit
    // row — and paginated like every other list, because six rows today is not
    // a reason for this one list to be the one that is different (BR-4).
    listCategories(actor, { q, sort, limit, offset }) {
      const invalid = validateCategoryQuery({ q, sort });
      if (invalid.length > 0) throw unprocessable(invalid);

      const filters = {};
      if (q !== undefined) filters.q = q;

      return {
        items: listCategoryRows(db, {
          filters,
          sort: sort ?? DEFAULT_CATEGORY_SORT,
          limit,
          offset,
        }).map((row) => ({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        total: countCategories(db, { filters }),
        limit,
        offset,
      };
    },

    // Assigning, unassigning, and the first implementation of BR-5 in this
    // product. Three more writes copy this shape — status, priority, article
    // edit — so what is written here is what they will read.
    assign(actor, { id, assigneeId, revision }) {
      const invalid = validateAssignment({ assigneeId, revision });
      if (invalid.length > 0) throw unprocessable(invalid);

      const at = stamp();

      return transact(db, () => {
        // null is a ticket returning to nobody, which is an ordinary
        // assignment and not a special case. Anything else must be somebody
        // who still works here.
        if (assigneeId !== null && !findLiveAssigneeId(db, { assigneeId })) {
          throw unprocessable(['assigneeId']);
        }

        // Read before writing, because the audit row needs the previous
        // assignee: a trail that records only who a ticket went to cannot
        // answer "who took it off me".
        const before = findTicketById(db, { id });
        if (!before) throw new HttpError(404, 'NOT_FOUND');

        const { changes } = assignTicket(db, { id, assigneeId, revision, at });
        if (changes === 0) {
          // The row was read a moment ago, in this transaction, on the only
          // connection this app opens — so it is still there, and the revision
          // is the only other thing the WHERE clause tests. No re-read: a
          // branch for a case that cannot happen sends the next reader looking
          // for a concurrent writer that does not exist.
          throw new HttpError(409, 'REVISION_MISMATCH');
        }

        audit.record(actor, {
          entity: 'ticket',
          entityId: id,
          verb: 'ticket.assign',
          before: { assigneeId: before.assignee_id },
          after: { assigneeId },
          at,
        });

        return publicShape(findTicketById(db, { id }));
      });
    },

    // The second BR-5 write. It reads like assign because it is the same
    // shape; what is different is that a refusal here has to explain itself.
    changeStatus(actor, { id, status, revision, note }) {
      const invalid = validateStatusChange({ status, revision, note });
      if (invalid.length > 0) throw unprocessable(invalid);

      const at = stamp();

      return transact(db, () => {
        const before = findTicketById(db, { id });
        if (!before) throw new HttpError(404, 'NOT_FOUND');

        // Both refusals below carry the legal moves from where the ticket
        // IS, not from where the caller wanted it — the caller already knows
        // the second one. This is T-7.
        const legal = allowedFrom(before.status);

        // Asking for the status a ticket already has is not a transition. It
        // has to be refused rather than waved through: a no-op that bumps the
        // revision and writes an audit row recording that nothing happened
        // makes the trail lie, and makes every other caller's revision stale
        // for free.
        if (before.status === status) {
          throw new ConflictError('STATUS_UNCHANGED', legal);
        }

        if (!legal.includes(status)) {
          throw new ConflictError('ILLEGAL_TRANSITION', legal);
        }

        // Null on every other edge, which is what the CASE in the SQL keys
        // off. Trimmed, because '  fixed it  ' and 'fixed it' are the same
        // note and only one of them should be what the customer reads.
        const resolutionNote = status === 'resolved' ? note.trim() : null;

        const { changes } = updateTicketStatus(db, {
          id, status, revision, at, resolutionNote,
        });
        if (changes === 0) {
          // No `allowed` here, and that is the point: the transition was
          // legal. Nothing the caller could have asked for instead would have
          // helped, so the question T-7 answers does not arise.
          throw new HttpError(409, 'REVISION_MISMATCH');
        }

        audit.record(actor, {
          entity: 'ticket',
          entityId: id,
          verb: 'ticket.status',
          before: { status: before.status },
          // The note is in the trail only on the edge that wrote it. Recording
          // a null on every other move would make the trail say the note was
          // cleared, which is not what happened.
          after: status === 'resolved' ? { status, resolutionNote } : { status },
          at,
        });

        return publicShape(findTicketById(db, { id }));
      });
    },
  };
}
