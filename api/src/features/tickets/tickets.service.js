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
  dueForAutoClose,
  withinReopenWindow,
  normaliseCategoryName,
  validateCategoryName,
  validateCategoryChange,
  validateStatusChange,
} from './tickets.rules.js';
import {
  assignTicket,
  countCategories,
  countTickets,
  findLiveCategoryId,
  findLiveAssigneeId,
  findLiveCustomerId,
  findOpenTicketsAssignedTo,
  findResolvedTickets,
  findTicketById,
  countCustomerTickets,
  insertTicket,
  findCategoryById,
  findLiveCategoryByName,
  insertCategory,
  listCategories as listCategoryRows,
  listCustomerTickets,
  listTickets,
  renameCategory as renameCategoryRow,
  retireCategory as retireCategoryRow,
  updateTicketCategory,
  updateTicketStatus,
} from './tickets.repository.js';

// Every status the desk still owes something on. Not the same as the status
// literally called `open`: a `pending` ticket is waiting on the customer and a
// `reopened` one is back on the pile, and both are work. `resolved` and
// `closed` are the two the desk has finished with.
// What a category looks like to anyone outside this feature. deleted_at is not
// a field: a retired category is absent from the list, and the one route that
// reads a retired one by id is answering a question about a ticket rather than
// about the list.
//
// It was written inline inside listCategories until three more callers needed
// it. Two copies of a shape drift the first time one gains a field.
const categoryShape = (row) => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const OPEN_ON_THE_DESK = Object.freeze(['new', 'open', 'pending', 'reopened']);

const publicShape = (row, nowSeconds) => ({
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
  // Where it came in from. Provenance, not a filter: the desk reads it to know
  // whether it is talking to somebody who was on the phone or somebody who
  // filled in a form, and a support conversation reads differently either way.
  channel: row.channel,
  // The moves that are legal from where this ticket is. Derived from the same
  // table the refusal reads, so it cannot drift from it — and it is here
  // because a client has no other way to know. Without it a screen either
  // copies the transition table into its own language, which is one product
  // rule in two places, or offers every move and lets the 409 narrow them,
  // which makes the refusal the interface rather than the backstop.
  allowedTransitions: allowedFrom(row.status),
  // Whether a reply would still reopen this (T-5), answered by the same rule
  // the refusal reads rather than by a client counting days.
  //
  // A fact about the TICKET, not about the reader: a customer's reply reopens
  // a resolved ticket and an agent's does not, so a field named for the act
  // would be false for half of the people it is sent to. The portal knows who
  // its reader is and says what it means for them.
  //
  // Without it the warning the portal owes a customer — that replying will
  // reopen this — is either absent or computed from a fourteen-day rule the
  // screen has copied, which is the product rule in two places. That is the
  // argument allowedTransitions makes above for its own existence.
  reopenWindowOpen:
    row.status === 'resolved'
    && withinReopenWindow({ resolvedAt: row.resolved_at, nowSeconds }),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createTicketsService({ db, notifications, serviceLevels: given, now = () => Math.floor(Date.now() / 1000) }) {
  const stamp = () => new Date(now() * 1000).toISOString();
  const audit = createAuditWriter({ db });
  // Handed in by compose, which holds the one the conversation feature and the
  // sweep route also use. The default keeps every existing caller working —
  // and building one here unconditionally is how two objects for one thing
  // start, which is L-62 and has already cost this codebase an afternoon.
  const serviceLevels = given ?? createServiceLevels({ db, now });

  return {
    raise(actor, input) {
      // The shape check first, so nothing malformed reaches the transaction and
      // a 422 names fields rather than values.
      const invalid = validateRaisedTicket(input ?? {});
      if (invalid.length > 0) throw unprocessable(invalid);

      const { subject, body, priority, categoryId, channel } = normaliseRaisedTicket(input);
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
          channel,
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
          // The channel is on the audit row as well as the column: BR-2 asks
          // what changed, and "a ticket appeared, from outside" is a different
          // event from "an agent raised one" even though the row looks alike.
          after: { customerId: input.customerId, priority, status: 'new', channel },
          at,
        });

        // Read back inside the transaction: the revision was defaulted by the
        // column, so the row is the only place it exists.
        return publicShape(findTicketById(db, { id }), now());
      });
    },

    // The queue every agent shares. It is NOT scoped to whoever is asking:
    // "an agent sees all of it" is the story's own title, and SC-1 is one
    // organisation, one queue. `actor` arrives because the route is guarded,
    // not because it filters anything.
    //
    // A read writes no audit row.
    // `scope` is not part of the request. The router calls this with two
    // arguments; only `mine` above passes a third, and it takes the customer
    // id from the subject rather than from anything a caller sent.
    list(actor, { status, priority, assigneeId, categoryId, sort, limit, offset }, scope = {}) {
      const invalid = validateQueueQuery({ status, priority, assigneeId, categoryId, sort });
      if (invalid.length > 0) throw unprocessable(invalid);

      const filters = {};
      if (status !== undefined) filters.status = status;
      if (priority !== undefined) filters.priority = priority;
      if (categoryId !== undefined) filters.categoryId = categoryId;
      // null is how the repository spells "IS NULL"; the sentinel stops at
      // this boundary and no SQL below knows the word.
      if (assigneeId !== undefined) filters.assigneeId = assigneeId === UNASSIGNED ? null : assigneeId;
      if (scope.customerId !== undefined) filters.customerId = scope.customerId;

      const rows = listTickets(db, { filters, sort: sort ?? DEFAULT_SORT, limit, offset });
      // One query for the whole page rather than one per row. The breaches are
      // read from the stored rows and never recomputed (S-5) — a queue that
      // worked them out would be a second answer to "is this late", and it
      // would change while nobody changed anything.
      const breaches = serviceLevels.breachesForMany({ ticketIds: rows.map((r) => r.id) });

      return {
        items: rows.map((row) => ({
          ...publicShape(row, now()),
          breaches: breaches.get(row.id) ?? [],
        })),
        // The matches, not the page.
        total: countTickets(db, { filters }),
        limit,
        offset,
      };
    },

    // A customer's own tickets. Not the queue, and a different route: the
    // queue belongs to the desk (SC-1, one organisation and one queue) and
    // refuses a customer, which PORTAL-2-WEB's own criteria assert. One route
    // whose answer changed depending on who asked would make "what does GET
    // /tickets return" a question with two answers.
    //
    // It reuses list() rather than querying again, so a customer's page is
    // paginated, ordered and shaped by exactly the code the desk's is. The
    // customer id comes from the SUBJECT and never from a parameter — a
    // caller-supplied one would be an invitation to read somebody else's.
    //
    // NOTE — this route is not in scripts/backlog.txt. Nothing in the 138
    // units provides a way for a customer to list their own tickets:
    // PORTAL-2-WEB is declared WEB-only and needs CUSTOMERS-6-API and
    // TICKETS-8-API, neither of which answers this question. The story could
    // not be built without it. Recorded here and in the plan rather than
    // absorbed quietly, because a backlog that is missing a unit should say so
    // (L-56).
    mine(actor, { status, priority, categoryId, sort, limit, offset }) {
      // Staff have the queue. Answering this for them would be a second way to
      // ask the same question, with a subject that has no customer behind it.
      if (actor?.role !== 'customer') throw new HttpError(403, 'FORBIDDEN');
      // A customer-role subject with no customer linked to it cannot be
      // created today, and if one existed it owns nothing. The safe answer is
      // an empty page rather than everybody's tickets — which is what an
      // undefined filter would have produced.
      if (!actor.customerId) return { items: [], total: 0, limit, offset };

      return this.list(
        { ...actor, role: 'agent' },
        { status, priority, categoryId, sort, limit, offset },
        { customerId: actor.customerId },
      );
    },

    // One customer's open tickets, for the screen that shows a customer whole.
    //
    // "Open on the desk" is every status the desk still owes something on —
    // NOT the status literally called `open`. Naming it as a constant is the
    // difference between a reader understanding the query and guessing at it.
    openForCustomer(actor, { customerId, limit, offset }) {
      return {
        items: listCustomerTickets(db, {
          customerId,
          statuses: OPEN_ON_THE_DESK,
          limit,
          offset,
        }).map((row) => publicShape(row, now())),
        total: countCustomerTickets(db, { customerId, statuses: OPEN_ON_THE_DESK }),
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
      const ticket = findTicketById(db, { id });
      if (!ticket) throw new HttpError(404, 'NOT_FOUND');
      // Reading somebody else's trail is acting on their ticket. The link
      // exists now (CUSTOMERS-6-API), so this is the comparison the earlier
      // comment promised rather than the blanket refusal that stood in for it:
      // a customer reads their own ticket's history, and anybody else's ticket
      // answers exactly what a missing one does.
      if (actor?.role === 'customer' && ticket.customer_id !== actor.customerId) {
        throw new HttpError(404, 'NOT_FOUND');
      }

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
    // An admin adds a category, without a migration and without touching the
    // seed. SC-3 says the seed produces a working system; it does not say the
    // system is stuck with what the seed produced.
    addCategory(actor, { name }) {
      const invalid = validateCategoryName({ name });
      if (invalid.length > 0) throw unprocessable(invalid);
      const clean = normaliseCategoryName(name);

      return transact(db, () => {
        // Checked here rather than left to the unique index, for CRM-82's
        // reason: an index that fires gives a raw SQLite error, which escapes
        // as a 500 and tells an admin their reasonable request was our fault.
        // The index stays as the second guard.
        if (findLiveCategoryByName(db, { name: clean })) throw unprocessable(['name']);

        const id = randomUUID();
        const at = stamp();
        const created = insertCategory(db, { id, name: clean, at });

        audit.record(actor, {
          entity: 'ticket-category',
          entityId: id,
          verb: 'category.create',
          before: null,
          after: { name: clean },
          at,
        });

        return categoryShape(created);
      });
    },

    // A rename reaches every ticket that carries the category, because a ticket
    // references it rather than copying its name — which is the thing that
    // makes a rename possible at all, and the reason `raise` stores an id.
    renameCategory(actor, { id, name }) {
      const invalid = validateCategoryName({ name });
      if (invalid.length > 0) throw unprocessable(invalid);
      const clean = normaliseCategoryName(name);

      return transact(db, () => {
        const before = findCategoryById(db, { id });
        // A retired category is not renamed. Its name is what the tickets
        // carrying it say happened, and BR-1 keeps them for exactly that.
        if (!before || before.deleted_at) throw new HttpError(404, 'NOT_FOUND');

        const taken = findLiveCategoryByName(db, { name: clean });
        // Renaming a category to what it is already called is not a conflict
        // with itself. It is a no-op the caller may not have meant, and
        // refusing it would make "no change" indistinguishable from "taken".
        if (taken && taken.id !== id) throw unprocessable(['name']);

        const at = stamp();
        renameCategoryRow(db, { id, name: clean, at });

        audit.record(actor, {
          entity: 'ticket-category',
          entityId: id,
          verb: 'category.rename',
          before: { name: before.name },
          after: { name: clean },
          at,
        });

        return categoryShape(findCategoryById(db, { id }));
      });
    },

    // Retiring takes it off the list the form offers. It does NOT take it off
    // the tickets that carry it: a category that vanished from its tickets
    // would rewrite history to tidy a picker (BR-1).
    retireCategory(actor, { id }) {
      return transact(db, () => {
        const before = findCategoryById(db, { id });
        if (!before || before.deleted_at) throw new HttpError(404, 'NOT_FOUND');

        const at = stamp();
        retireCategoryRow(db, { id, at });

        audit.record(actor, {
          entity: 'ticket-category',
          entityId: id,
          verb: 'category.retire',
          before: { deletedAt: null },
          after: { deletedAt: at },
          at,
        });

        return { id, retiredAt: at };
      });
    },

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
        }).map(categoryShape),
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

        // SC-2, and it fails closed on purpose.
        //
        // A customer may act only on their own ticket. Today no customer can
        // hold a token at all — sign-in reads `users`, the subject resolver
        // returns { id, role, name }, and there is no column linking a user to
        // a customer in either direction — so there is nothing to compare and
        // the safe answer is to refuse every customer-role subject here.
        //
        // THE LINK HAS LANDED. CUSTOMERS-6-API added customers.user_id and the
        // subject resolver now carries actor.customerId, so the comparison
        // this comment promised exists — in `history`, which is the path a
        // customer has a reason to walk. Here it stayed a refusal, on the
        // argument in the note below it. Whoever added the link also
        // meet this comment rather than having to think of the rule.
        //
        // 404 rather than 403, and deliberately the same 404 as the line
        // above: a refusal that told "not yours" apart from "not there" would
        // confirm to a stranger that somebody else's ticket exists.
        //
        // A new service method taking an actor and an id under /tickets/:id
        // runs this same check inside its transaction, right after the
        // not-found refusal. ticket-ownership.guarantee.test.js fails until it
        // does — it reads the routes off the router rather than a list.
        if (actor?.role === 'customer') throw new HttpError(404, 'NOT_FOUND');
        // Note this stayed a blanket refusal while `history` above became a
        // comparison, and the difference is deliberate. Reading your own trail
        // is something a customer does; handing your ticket to a named agent
        // is the desk operating its own queue, and no story asks for a
        // customer to do it. It is a rule now rather than the placeholder it
        // was — the same 404 either way, so nothing about the answer's shape
        // reveals which of the two it is.

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

        // Told, in the same transaction. An assignment nobody is told about is
        // the gap NOTIFICATIONS-1-API exists to close, and a notification for
        // an assignment that did not happen is worse than either.
        //
        // Notifications decides whether there is anything to write — nobody is
        // told they assigned a ticket to themselves — because that is a rule
        // about notifying and not a rule about assigning.
        notifications?.ticketAssigned(actor, { ticketId: id, assigneeId, at });

        return publicShape(findTicketById(db, { id }), now());
      });
    },

    // The second BR-5 write. It reads like assign because it is the same
    // shape; what is different is that a refusal here has to explain itself.
    // The third BR-5 write. Same shape as assign and status: the revision in
    // the WHERE, `revision = revision + 1` in the SET, and `changes === 0` as
    // the refusal — a caller whose revision is not the ticket's did not see
    // what they are about to overwrite.
    changeCategory(actor, { id, categoryId, revision }) {
      const invalid = validateCategoryChange({ categoryId, revision });
      if (invalid.length > 0) throw unprocessable(invalid);

      const at = stamp();

      return transact(db, () => {
        const before = findTicketById(db, { id });
        if (!before) throw new HttpError(404, 'NOT_FOUND');
        // Ownership, as in assign — the same blanket refusal for the same
        // reason: a ticket's category is the desk's filing, not the customer's.
        if (actor?.role === 'customer') throw new HttpError(404, 'NOT_FOUND');

        // null is a ticket with no category, which the column allows and a
        // ticket may legitimately have. Anything else must be a category that
        // is still on the list — checked here rather than left to the foreign
        // key, which can see that a row exists and cannot see that it was
        // retired. `raise` refuses a retired category for exactly this reason
        // and this does not weaken it: what may not be chosen for a new ticket
        // may not be chosen for an old one.
        if (categoryId !== null && !findLiveCategoryId(db, { categoryId })) {
          throw unprocessable(['categoryId']);
        }

        const { changes } = updateTicketCategory(db, { id, categoryId, revision, at });
        if (changes === 0) throw new ConflictError('REVISION_MISMATCH');

        audit.record(actor, {
          entity: 'ticket',
          entityId: id,
          verb: 'ticket.category',
          before: { categoryId: before.category_id },
          after: { categoryId },
          at,
        });

        return publicShape(findTicketById(db, { id }), now());
      });
    },

    // The ticket, with the ownership rule attached, for another feature that
    // needs it. It opens no transaction — so a caller inside one can use it,
    // and a caller doing a pure read is not made to open one.
    //
    // A read with the rule attached rather than a read and a rule: a caller
    // cannot get a ticket this actor may not touch and then decide for itself
    // what to do about that. The refusal is the same 404 a missing ticket
    // gets, from the one place that decides it.
    //
    // It was `readForReply` while replying was the only caller. Reading a
    // ticket's messages is the second, and a name that says what one caller
    // wanted is a name that misleads the next one.
    // One ticket, in the shape every other route answers with.
    //
    // readForActor decides who may see it, so this adds no rule of its own —
    // and deliberately returns the same shape the queue's rows carry, because
    // a screen that read a ticket differently depending on which route it came
    // from would be two descriptions of one thing.
    read(actor, { id }) {
      const ticket = this.readForActor(actor, { id });
      return {
        ...publicShape(ticket, now()),
        // From the stored rows, like the queue's (S-5).
        breaches: serviceLevels.breachesFor({ ticketId: id }),
      };
    },

    readForActor(actor, { id }) {
      const ticket = findTicketById(db, { id });
      if (!ticket) throw new HttpError(404, 'NOT_FOUND');
      if (actor?.role === 'customer' && ticket.customer_id !== actor.customerId) {
        throw new HttpError(404, 'NOT_FOUND');
      }
      return ticket;
    },

    // Hand back everything an agent still has to work on, because their
    // account is being disabled.
    //
    // From inside the caller's transaction, like stopClock and
    // openOnFirstReply beside it: identity disables the user and this moves
    // the tickets, and an account disabled with its queue still assigned to it
    // is worse than either outcome alone — the work is invisible and its owner
    // cannot sign in. SQLite refuses BEGIN inside BEGIN, so this opens none.
    //
    // It lives here rather than in identity because the tickets table is this
    // feature's, and a second place that wrote assignee_id would be a second
    // set of rules about what an assignment is.
    unassignAllFor(actor, { assigneeId, at }) {
      const theirs = findOpenTicketsAssignedTo(db, { assigneeId });

      for (const ticket of theirs) {
        // The revision read a line ago, inside this transaction — so the
        // compare-and-set cannot fail, and BR-5's guard stays on every write
        // rather than gaining an exception for sweeps. The bump matters: an
        // agent holding this ticket open is correctly refused afterwards.
        assignTicket(db, { id: ticket.id, assigneeId: null, revision: ticket.revision, at });

        // The disabling ADMIN is the actor, not the agent losing the ticket.
        // The trail must not show tickets that moved with nobody moving them,
        // and nobody is what an audit row with the wrong actor amounts to.
        audit.record(actor, {
          entity: 'ticket',
          entityId: ticket.id,
          verb: 'ticket.assign',
          before: { assigneeId },
          after: { assigneeId: null },
          at,
        });
      }

      return theirs.length;
    },

    // The reopen a REPLY causes (T-5), from inside the caller's transaction.
    //
    // It opens none of its own, like openOnFirstReply beside it, because the
    // message and the status move commit together — a reply that reopened a
    // ticket and then failed to say so would be worse than either alone.
    //
    // It shares the window rule rather than repeating it: `withinReopenWindow`
    // is the one place that decides when a resolution becomes final, and
    // changeStatus asks it the same question.
    //
    // Answers whether it reopened anything. `false` for a ticket that was not
    // resolved, which is most replies; the window's refusal throws, because
    // that is a request the caller must not treat as a quiet no-op.
    reopenOnReply(actor, { id, at }) {
      const before = findTicketById(db, { id });
      if (!before) throw new HttpError(404, 'NOT_FOUND');

      // Closed is terminal, and a reply is not a way round that. It is refused
      // rather than accepted-and-ignored: a customer replying to a closed
      // ticket means to reopen it, and storing the message while the reopen
      // cannot happen would leave them believing they had been heard.
      //
      // The same answer the state machine gives, from the same table — T-7's
      // shape, and `allowed` is empty because from closed nothing is legal.
      // TICKETS-4-API made that argument and this does not reopen it.
      if (before.status === 'closed') throw new ConflictError('ILLEGAL_TRANSITION', allowedFrom('closed'));

      // Any other status that is not `resolved` — the reply is just a reply.
      if (before.status !== 'resolved') return false;

      if (!withinReopenWindow({ resolvedAt: before.resolved_at, nowSeconds: now() })) {
        throw new ConflictError('REOPEN_WINDOW_CLOSED');
      }

      const { changes } = updateTicketStatus(db, {
        id,
        status: 'reopened',
        revision: before.revision,
        at,
        resolutionNote: null,
      });
      if (changes === 0) throw new Error('the ticket moved under a transaction that held it');

      audit.record(actor, {
        entity: 'ticket',
        entityId: id,
        verb: 'ticket.status',
        before: { status: 'resolved' },
        after: { status: 'reopened' },
        at,
      });
      return true;
    },

    // T-6: close every resolved ticket whose fourteen days have passed.
    //
    // There is no scheduler in this application and none is added here. The
    // sweep is a method something calls — a route an operator or a cron hits —
    // and that choice is stated rather than hidden in a comment, because the
    // alternative was worse: evaluating on read would make every read of a
    // ticket a potential write, and a ticket nobody reads would never close,
    // which is the one thing T-6 promises.
    //
    // Each ticket closes in its own transaction. One transaction around the
    // whole sweep would mean a single ticket that could not be closed —
    // because somebody moved it a millisecond earlier — undoing the others.
    // The sweep is a series of independent facts, not one atomic act.
    sweepAutoClose() {
      const at = stamp();
      const nowSeconds = now();
      const closed = [];

      for (const ticket of findResolvedTickets(db)) {
        if (!dueForAutoClose({ resolvedAt: ticket.resolved_at, nowSeconds })) continue;

        transact(db, () => {
          const { changes } = updateTicketStatus(db, {
            id: ticket.id,
            status: 'closed',
            // The revision read a moment ago. BR-5's guard stays on every
            // write; the sweep is not an exception to it, and if somebody
            // moved this ticket between the read and here, `changes` is 0 and
            // this one is skipped rather than overwritten.
            revision: ticket.revision,
            at,
            resolutionNote: null,
          });
          if (changes === 0) return;

          // A null actor, which the trail renders as the system. Attributing
          // it to whichever admin called the route would be a false record:
          // they chose when the sweep ran, not which tickets were due. That is
          // the rule's decision, and the rule has no name.
          audit.record(null, {
            entity: 'ticket',
            entityId: ticket.id,
            verb: 'ticket.status',
            before: { status: 'resolved' },
            after: { status: 'closed' },
            at,
          });

          closed.push(ticket.id);
        });
      }

      // What it did, so an operator reading a cron log can tell a sweep that
      // found nothing from one that failed. Most sweeps will close nothing.
      return { closed: closed.length, at };
    },

    // A ticket in the shape a caller may see, by id, with no transaction and
    // no ownership check.
    //
    // No check because the only caller reads it AFTER readForActor has already
    // decided the actor may touch this ticket, inside the same transaction —
    // and a second check there would be the same question asked twice, with a
    // second chance to answer it differently. The name says what it does; a
    // caller that has not already established the right has no business
    // calling it, and there is exactly one.
    publicById(id) {
      const row = findTicketById(db, { id });
      return row ? publicShape(row, now()) : null;
    },

    // T-2's transition, and only that one: a `new` ticket becomes `open` when
    // the desk first answers it.
    //
    // It opens NO transaction, because it is called from inside the one that
    // wrote the reply — the reply, the clock stop and this move commit
    // together or not at all. Same shape as identity's makeUser.
    //
    // It lives here rather than in the conversation feature because the
    // transition table lives here: a second place that moved a ticket's status
    // would be a second set of rules about which moves are legal, agreeing
    // with this one right up until somebody edited one of them.
    //
    // No revision, and that is the difference from changeStatus. This is not
    // somebody choosing a move against a ticket they read a moment ago — it is
    // a consequence of a write that is already happening, inside the same
    // transaction, holding the row. BR-5 guards against overwriting a change
    // you did not see; there is nothing here that a caller could have missed.
    openOnFirstReply(actor, { id, at }) {
      const before = findTicketById(db, { id });
      if (!before) throw new HttpError(404, 'NOT_FOUND');
      // Not `new` means the desk has already answered, or the ticket has moved
      // on some other way. T-2 names one transition and this makes no others.
      if (before.status !== 'new') return false;
      if (!allowedFrom('new').includes('open')) {
        // The transitions table is the authority even for a move this feature
        // is sure about. If it ever stops allowing new -> open, this should
        // stop too rather than write a status the table forbids.
        throw new Error('the transition table no longer allows new -> open');
      }

      const { changes } = updateTicketStatus(db, {
        id,
        status: 'open',
        revision: before.revision,
        at,
        resolutionNote: null,
      });
      // Inside the caller's transaction, holding the row read a line ago —
      // so zero changes is not a stale revision, it is a bug here.
      if (changes === 0) throw new Error('the ticket moved under a transaction that held it');

      audit.record(actor, {
        entity: 'ticket',
        entityId: id,
        verb: 'ticket.status',
        before: { status: before.status },
        after: { status: 'open' },
        at,
      });
      return true;
    },

    changeStatus(actor, { id, status, revision, note }) {
      const invalid = validateStatusChange({ status, revision, note });
      if (invalid.length > 0) throw unprocessable(invalid);

      const at = stamp();

      return transact(db, () => {
        const before = findTicketById(db, { id });
        if (!before) throw new HttpError(404, 'NOT_FOUND');

        // Ownership, and no longer a blanket refusal.
        //
        // This used to refuse every customer, and the comment argued that
        // moving a ticket through the state machine is the desk's work and a
        // customer's own actions are replies. That was right about the desk
        // and wrong about the customer: TICKETS-11-API gives them one move,
        // `resolved -> reopened` on their own ticket, and CONVERSATION-3-API
        // gives them the same move as a consequence of replying. Two ways to
        // do one thing, and this is the one somebody chooses deliberately.
        //
        // Exactly one move, and no other. A customer may not resolve, may not
        // close, may not move a ticket to pending — those are the desk saying
        // something about work it is doing. And somebody else's ticket is the
        // same 404 a missing one gets, whichever move they asked for, so
        // nothing about the answer says which of the two rules refused them.
        if (actor?.role === 'customer') {
          const owns = before.customer_id === actor.customerId;
          if (!owns || status !== 'reopened') throw new HttpError(404, 'NOT_FOUND');
        }

        // T-5's window, and it applies to whoever is asking.
        //
        // Not a rule about customers: it is a fact about the ticket. T-6 closes
        // a resolved ticket once the same fourteen days have passed, so after
        // the window there is nothing to reopen anyway — two rules for one
        // period, differing by who asks, would be two answers to when a
        // resolution becomes final.
        //
        // Measured from resolved_at, not updated_at: updated_at moves for
        // anything, and a window any activity resets is not a window. A NULL
        // resolved_at fails the check, which is the safe direction — a ticket
        // whose resolution moment is unknown is not reopenable.
        if (
          status === 'reopened'
          && before.status === 'resolved'
          && !withinReopenWindow({ resolvedAt: before.resolved_at, nowSeconds: now() })
        ) {
          throw new ConflictError('REOPEN_WINDOW_CLOSED');
        }

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

        // S-4, on both edges of `pending`, inside this transaction.
        //
        // Entering pauses the resolution clock; leaving closes the pause and
        // adds what it cost — including on the way to `resolved`, where the
        // pause has to be counted before the clock stops or the resolution
        // would be recorded as slower than it was.
        //
        // Keyed off the move rather than the destination alone, because
        // `pending → pending` is not a move the state machine allows and a
        // check on the destination would pause a clock that is already paused.
        if (before.status !== 'pending' && status === 'pending') {
          serviceLevels.pause({ ticketId: id, at });
        } else if (before.status === 'pending' && status !== 'pending') {
          serviceLevels.resume({ ticketId: id, at });
        }

        // And resolving stops the resolution clock. Until now nothing did, on
        // any path: `stopClock` was called for `first_response` when the desk
        // first replied and for nothing else, so a resolved ticket's promise
        // kept running and would eventually report itself overdue. A breach
        // sweep built on that would have recorded one against every ticket the
        // desk resolved on time.
        //
        // Found while building SERVICE-LEVELS-2-API and handed to this story,
        // whose own criterion — "a clock that stopped before its deadline
        // records nothing" — needs it to be true.
        if (status === 'resolved') {
          serviceLevels.stopClock({ ticketId: id, kind: 'resolution', at });
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

        return publicShape(findTicketById(db, { id }), now());
      });
    },
  };
}
