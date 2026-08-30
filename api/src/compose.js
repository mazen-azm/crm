import { createApp } from './app.js';
import { channelsRouter } from './features/channels/index.js';
import { createCustomersService, customersRouter } from './features/customers/index.js';
import { createIdentityService, identityRouter, identitySubjectResolver } from './features/identity/index.js';
import { createTicketsService, ticketsRouter, validateTicketFields } from './features/tickets/index.js';
import { createKeyedThrottle } from './platform/http/throttle.js';

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
      // Customers holds identity because granting a customer a sign-in writes
      // a user row and the customers.user_id link in one transaction, and
      // SQLite refuses a transaction inside a transaction — so the two writes
      // have to happen under one, which means one service calling the other's
      // method rather than its route.
      const identityService = createIdentityService(identity);
      const customers = createCustomersService({ db, now, tickets, identity: identityService });

      v1.use(identityRouter({ service: identityService }));
      v1.use(customersRouter({ customers }));
      v1.use(ticketsRouter({ db, now }));
      // One throttle per composed app, the way sign-in's is built inside its
      // own service: every test then starts with empty counters and cannot
      // inherit another test's.
      //
      // Sixty a minute from one host is faster than anybody filling in a form
      // and slower than a flood. It is a policy number, not a rule, so it is
      // named here rather than made configurable — a knob nobody has asked to
      // turn is a knob with no argument behind its default.
      //
      // LIMITATION — process-local, and restated rather than assumed read: a
      // second api process keeps its own Map, so the ceiling is per-process.
      // LIMITATION — `address` is whatever the route hands it. app.js sets no
      // `trust proxy`, so behind a reverse proxy every request arrives from
      // one address and the ceiling throttles the world at once. Both are the
      // same limitations the sign-in throttle carries, and a limitation nobody
      // repeats is a limitation somebody discovers.
      const intakeThrottle = createKeyedThrottle({ now, windowSeconds: 60, addressCeiling: 60 });

      // The public intake. It owns no table: it resolves a customer through
      // the customers service and raises the ticket through the tickets one,
      // which is what keeps a request from outside on the same path as a
      // request from the desk (SC-2).
      v1.use(channelsRouter({ customers, tickets, validateTicketFields, throttle: intakeThrottle }));
    },
  });
}
