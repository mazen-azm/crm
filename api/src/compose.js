import { createApp } from './app.js';
import { customersRouter } from './features/customers/index.js';
import { identityRouter, identitySubjectResolver } from './features/identity/index.js';
import { ticketsRouter } from './features/tickets/index.js';

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
      v1.use(identityRouter(identity));
      v1.use(customersRouter({ db, now }));
      v1.use(ticketsRouter({ db, now }));
    },
  });
}
