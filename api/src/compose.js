import { createApp } from './app.js';
import { channelsRouter } from './features/channels/index.js';
import { createCustomersService, customersRouter } from './features/customers/index.js';
import { identityRouter, identitySubjectResolver } from './features/identity/index.js';
import { createTicketsService, ticketsRouter, validateTicketFields } from './features/tickets/index.js';

// What the production application is, in one place. server.js starts it and
// the contract test inspects it, so "the routes we serve" has a single
// definition — a test that built its own arrangement would be checking the
// document against an application nobody runs.
//
// app.js stays platform-only and learns no feature's name; the features are
// gathered here and handed to it.
export function composeApp({ db, secret, now = () => Math.floor(Date.now() / 1000) }) {
  const identity = { db, secret, now };

  return createApp({
    subjectResolver: identitySubjectResolver(identity),
    mountFeatures: (v1) => {
      // Built once, here, and handed to whoever needs them. A feature reaches
      // another only through its index, so nothing below imports a sibling's
      // internals — and one instance rather than three means there is one
      // answer to what the customers service is.
      const tickets = createTicketsService({ db, now });
      const customers = createCustomersService({ db, now, tickets });

      v1.use(identityRouter(identity));
      v1.use(customersRouter({ customers }));
      v1.use(ticketsRouter({ db, now }));
      // The public intake. It owns no table: it resolves a customer through
      // the customers service and raises the ticket through the tickets one,
      // which is what keeps a request from outside on the same path as a
      // request from the desk (SC-2).
      v1.use(channelsRouter({ customers, tickets, validateTicketFields }));
    },
  });
}
