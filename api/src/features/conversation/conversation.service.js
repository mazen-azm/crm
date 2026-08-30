import { randomUUID } from 'node:crypto';

import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { createAuditWriter, transact } from '../audit/index.js';
import { countMessages, insertMessage, listMessages } from './conversation.repository.js';
import { normaliseMessage, validateMessage } from './conversation.rules.js';

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

    // An agent replies, in public. T-2: the first public reply opens a `new`
    // ticket and stops the response clock — once.
    //
    // "Once" is a property of the clock and of the status, not of a count.
    // The clock's stop matches `stopped_at IS NULL` and the status move
    // matches `status = 'new'`; a second reply finds neither and changes
    // neither. Nothing counts replies, because a count is a third statement
    // of a fact the two rows already carry.
    reply(actor, { ticketId, body }) {
      const invalid = validateMessage({ body });
      if (invalid.length > 0) throw unprocessable(invalid);

      return transact(db, () => {
        // Read inside the transaction: the status decides whether the clock
        // stops, so it has to be the status this write is committing against.
        // It throws the ownership 404 for a customer reaching somebody else's.
        const ticket = tickets.readForActor(actor, { id: ticketId });

        // And this story refuses a customer their OWN ticket too. Replying is
        // theirs to do — CONVERSATION-3-API — and it is a different rule: a
        // customer's reply reopens a resolved ticket and stops no clock. The
        // refusal wears the same 404 as everything else under a ticket, so
        // nothing about the answer says which of the two rules stopped it.
        if (actor?.role === 'customer') throw new HttpError(404, 'NOT_FOUND');
        const at = stamp();
        const id = randomUUID();

        const message = insertMessage(db, {
          id,
          ticketId,
          authorId: actor.id,
          // The kind is not read from the request. This route posts public
          // replies; the internal note has its own story, and a caller that
          // could name the kind could name the one they are not allowed.
          kind: 'public',
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
          after: { messageId: id, kind: 'public' },
          at,
        });

        // The clock stops at the REPLY's timestamp, not at whenever this line
        // runs. S-1 measures the promise from the ticket's creation to the
        // answer, and "the answer" is the message above.
        serviceLevels.stopClock({ ticketId, kind: 'first_response', at });

        // T-2's transition, owned by the tickets feature and run inside this
        // transaction. It answers false when the ticket was not `new`, which
        // is most replies.
        tickets.openOnFirstReply(actor, { id: ticketId, at });

        return message;
      });
    },
  };
}
