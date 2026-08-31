import { randomUUID } from 'node:crypto';

import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { createAuditWriter, transact } from '../audit/index.js';
import { countMessages, insertMessage, listMessages } from './conversation.repository.js';
import { KINDS, normaliseMessage, validateMessage } from './conversation.rules.js';

// What a ticket says.
//
// It owns one table and calls two other features for the things they own: the
// tickets feature moves a status, because the transition table lives there,
// and the service-levels feature stops a clock, because sla_clocks lives
// there. Both are handed in at composition — a feature reaches another only
// through its index.
//
// ONE TRANSACTION, and that is the design. The reply, the audit row, the
// clock stop and the status move commit together or not at all, which is why
// both of the methods it calls on other features open no transaction of their
// own: SQLite refuses a transaction inside a transaction, and a sequence that
// committed the reply and then tried to move the status would have a failure
// mode where a ticket has been answered and does not say so.
export function createConversationService({ db, tickets, serviceLevels, now = () => Math.floor(Date.now() / 1000) }) {
  const stamp = () => new Date(now() * 1000).toISOString();
  const audit = createAuditWriter({ db });

  return {
    // A ticket's thread, for whoever is reading it.
    //
    // One predicate decides what a reader may see, and it is applied in the
    // query rather than to the rows afterwards: filtering after the fact means
    // the notes were fetched, counted and held in memory a line away from the
    // response, and every later change to this method is one mistake from
    // sending them.
    //
    // A customer sees public messages and no sign that anything else exists —
    // not a redaction, not a gap, not a total that counts what they cannot
    // read. Staff see both kinds, and each row says which it is, because an
    // agent about to write something they would not say to a customer needs to
    // know which they are looking at.
    thread(actor, { ticketId, limit, offset }) {
      // The ownership rule, from the feature that owns it: somebody else's
      // ticket is the same 404 a missing one gets.
      tickets.readForActor(actor, { id: ticketId });

      const publicOnly = actor?.role === 'customer';
      return {
        items: listMessages(db, { ticketId, publicOnly, limit, offset }),
        total: countMessages(db, { ticketId, publicOnly }),
        limit,
        offset,
      };
    },

    // A public reply, from whoever may write one on this ticket.
    //
    // An agent's is the desk answering: T-2's first public reply opens a `new`
    // ticket and stops the response clock — once. A customer's is the customer
    // answering, which reopens a resolved ticket inside the window (T-5) and
    // stops nothing.
    //
    // "Once" is a property of the clock and of the status, not of a count.
    // The clock's stop matches `stopped_at IS NULL` and the status move
    // matches `status = 'new'`; a second reply finds neither and changes
    // neither. Nothing counts replies, because a count is a third statement
    // of a fact the two rows already carry.
    reply(actor, { ticketId, body, kind }) {
      const invalid = validateMessage({ body });
      if (invalid.length > 0) throw unprocessable(invalid);
      // A kind the vocabulary does not have is refused rather than silently
      // treated as public: a caller who sent one meant something by it.
      if (kind !== undefined && !KINDS.includes(kind)) throw unprocessable(['kind']);

      return transact(db, () => {
        // Read inside the transaction: the status decides whether the clock
        // stops, so it has to be the status this write is committing against.
        // It throws the ownership 404 for a customer reaching somebody else's.
        const ticket = tickets.readForActor(actor, { id: ticketId });

        const at = stamp();
        const id = randomUUID();

        const message = insertMessage(db, {
          id,
          ticketId,
          authorId: actor.id,
          // The desk chooses; a customer does not.
          //
          // An internal note is the desk talking to itself, and a customer who
          // could name the kind could write into the one place that is not for
          // them. So the kind is read from the request for staff and forced to
          // public for a customer — not refused for a customer, because a
          // request that is merely verbose is not a request to punish.
          //
          // This began as a hard-coded 'public' with a comment saying the note
          // had its own story. It has none: no unit in the backlog gives the
          // desk a way to WRITE one, and CONVERSATION-2-WEB cannot exist
          // without it (L-56). Written here, recorded there.
          kind: actor?.role === 'customer' ? 'public' : (kind ?? 'public'),
          body: normaliseMessage(body),
          at,
        });

        audit.record(actor, {
          entity: 'ticket',
          entityId: ticketId,
          verb: 'ticket.reply',
          before: null,
          // The message's id and its kind, never its body. A trail is a record
          // of what happened, and the message itself is a row anybody entitled
          // to read it can read.
          after: { messageId: id, kind: message.kind },
          at,
        });

        // What a reply DOES depends on who wrote it, and this is the whole
        // difference between the two stories that share this route.
        //
        // An agent answering is the desk's first response: it stops the clock
        // (S-1) and opens a `new` ticket (T-2). A customer answering is not
        // that — they are answering themselves, and the promise the clock
        // measures is about the desk. What their reply does instead is reopen
        // a resolved ticket, inside the window (T-5).
        //
        // One route and one message table, because posting a public message on
        // a ticket is one act. Two routes would be two write paths for it, and
        // the difference between them is not the writing.
        // An internal note does neither. T-2's promise is about answering the
        // customer, and a note is the desk talking to itself — a clock stopped
        // by one would report a response time to somebody who never saw a
        // word of it.
        if (message.kind === 'internal') return { message, ticket: tickets.publicById(ticketId) };

        if (actor?.role === 'customer') {
          // Throws when the window has passed, which is a refusal the caller
          // must not read as a quiet no-op — and nothing is written, because
          // the whole method is one transaction.
          tickets.reopenOnReply(actor, { id: ticketId, at });
        } else {
          // The clock stops at the REPLY's timestamp, not at whenever this
          // line runs. S-1 measures the promise from the ticket's creation to
          // the answer, and "the answer" is the message above.
          serviceLevels.stopClock({ ticketId, kind: 'first_response', at });

          // T-2's transition, owned by the tickets feature and run inside this
          // transaction. It answers false when the ticket was not `new`, which
          // is most replies.
          tickets.openOnFirstReply(actor, { id: ticketId, at });
        }

        // The message AND the ticket, because this route changes both and a
        // caller that only heard about one of them has to guess at the other.
        //
        // The desk's screen needs the status: a row still saying `new` after
        // the reply that opened it is the screen disagreeing with the ticket,
        // and the alternative is the screen recomputing T-2 for itself — a
        // second place that decides when a ticket opens.
        //
        // It also carries the revision, which this write bumped: every other
        // control on that row holds one, and they are all stale now.
        return { message, ticket: tickets.publicById(ticketId) };
      });
    },
  };
}
