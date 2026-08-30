import express from 'express';

import { createChannelsService } from './channels.service.js';

// req and res stop here. The service takes values and returns values.
export function channelsRouter({ customers, tickets, validateTicketFields, throttle }) {
  const service = createChannelsService({ customers, tickets, validateTicketFields });
  const router = express.Router();

  // Deliberately public. Every other route in this API places requireSubject()
  // — or requirePermission, which implies it — before its handler; this one
  // places nothing, because the caller is a stranger with no token and that is
  // the entire point of an intake. req.subject is null and stays null.
  //
  // 201 with the ticket it made, the way raising one at the desk answers: the
  // person needs a reference to quote, and a message saying it worked cannot
  // be read back.
  //
  // The throttle is checked before the service runs and counts EVERY arrival —
  // 201, 404, 422 alike. Sign-in counts failures because a successful sign-in
  // is a legitimate person arriving; an intake's successes are exactly what a
  // flood is made of, and one that counted only refusals could be walked past
  // by sending well-formed requests forever.
  //
  // req.ip is the socket peer: app.js sets no `trust proxy`, by decision, so
  // behind a reverse proxy this is the proxy's address and the ceiling would
  // hold for everybody at once. Wiring proxy trust is a deployment story and
  // this is where its absence bites.
  router.post('/intake/:channel/tickets', (req, res) => {
    const address = req.ip ?? null;
    throttle.check({ address });
    try {
      res.status(201).json(
        service.submit({
          channel: req.params.channel,
          email: req.body?.email,
          name: req.body?.name,
          subject: req.body?.subject,
          body: req.body?.body,
          priority: req.body?.priority,
          categoryId: req.body?.categoryId,
        }),
      );
    } finally {
      // In `finally`, so a refusal counts too. A throttle that only counted
      // what succeeded would let somebody probe with malformed requests
      // indefinitely — and probing is how a flood starts.
      //
      // The request refused BY the throttle does not reach here, so hammering
      // a closed door does not extend the ban. The window is anchored to the
      // first arrival in it and reopens on its own.
      throttle.count({ address });
    }
  });

  return router;
}
