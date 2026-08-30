import { HttpError, NotImplementedError, unprocessable } from '../../platform/http/errors.js';
import { isImplemented, isKnown } from './channels.rules.js';

// The seam. A request from outside reaches the same ticket the desk raises by
// hand — the same validation, the same clocks, the same audit row — because it
// goes through the same service rather than beside it. SC-2 says every rule is
// enforced in the API, and a second write path is a second set of rules that
// agree right up until they do not.
//
// It owns no table and no repository. Everything it does, it does by asking
// two other features, handed to it at composition (compose.js) because a
// feature reaches another only through its index.
export function createChannelsService({ customers, tickets, validateTicketFields }) {
  return {
    // No actor argument, and that is deliberate rather than an omission. The
    // intake is unauthenticated: there is nobody to name. Both the customer's
    // creation and the ticket's are recorded with a null actor, which the audit
    // writer already means as "the system".
    submit({ channel, email, name, subject, body, priority, categoryId }) {
      if (!isImplemented(channel)) {
        // Two different answers to two different questions, which is the whole
        // of this rule (E-3). A channel this system knows about and has
        // decided against is 501 and says which — "we know what you mean and
        // it is not built". A name nothing has heard of is 404: there is no
        // such thing. Collapsing them would either hide a decision or claim
        // one that was never made.
        if (isKnown(channel)) throw new NotImplementedError(channel);
        throw new HttpError(404, 'NOT_FOUND');
      }

      // The ticket's own fields are checked BEFORE the customer is resolved.
      // Resolution creates a customer when the address is new, so validating
      // afterwards would leave a customer row behind for every request that
      // was then refused — and a public form is exactly where malformed
      // requests come from. This is the rule the tickets feature owns, reached
      // through its index rather than copied.
      const invalid = validateTicketFields({ subject, body, priority, categoryId });
      if (invalid.length > 0) throw unprocessable(invalid);

      // I-2 and I-4: the address identifies, and a request from an address
      // nobody has creates a customer then and there. A missing or malformed
      // one is refused by resolution naming `email` — this does not check it
      // twice, because two validators for one field disagree eventually.
      const customer = customers.resolveByEmail(null, { email, name });

      // Two transactions, not one, and resolveByEmail's own comment says why:
      // it opens a transaction and SQLite refuses one inside another. The
      // order above is what makes that safe — nothing is written until both
      // the ticket's fields and the address have been accepted.
      return tickets.raise(null, {
        customerId: customer.id,
        subject,
        body,
        priority,
        categoryId,
        channel,
      });
    },
  };
}
