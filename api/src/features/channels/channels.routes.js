import express from 'express';

import { createChannelsService } from './channels.service.js';

// req and res stop here. The service takes values and returns values.
export function channelsRouter({ customers, tickets, validateTicketFields }) {
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
  router.post('/intake/:channel/tickets', (req, res) => {
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
  });

  return router;
}
