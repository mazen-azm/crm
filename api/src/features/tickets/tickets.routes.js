import express from 'express';

import { requireSubject } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';
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

  // The shared queue. Filters combine; an unknown one is refused rather than
  // ignored, and the page ceiling refuses rather than clamps (BR-4).
  router.get('/tickets', requireSubject(), (req, res) => {
    const { status, priority, assigneeId, categoryId, sort } = req.query ?? {};
    res.json(
      service.list(req.subject, {
        status,
        priority,
        assigneeId,
        categoryId,
        sort,
        ...readPagination(req),
      }),
    );
  });

  return router;
}
