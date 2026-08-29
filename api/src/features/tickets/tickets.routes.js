import express from 'express';

import { requireSubject } from '../../platform/http/permission.js';
import { createTicketsService } from './tickets.service.js';

// req and res stop here.
export function ticketsRouter({ db, now }) {
  const service = createTicketsService({ db, now });
  const router = express.Router();

  // Any signed-in staff member raises a ticket for a customer. One queue —
  // there is no team or organisation to route it to (SC-1).
  router.post('/tickets', requireSubject(), (req, res) => {
    res.status(201).json(service.raise(req.subject, req.body ?? {}));
  });

  return router;
}
