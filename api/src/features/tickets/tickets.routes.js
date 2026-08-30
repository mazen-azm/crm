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

  // The list a form offers when raising a ticket. Named after the table
  // (ticket_categories) rather than /categories, so the knowledge base can have
  // its own later without this one having to be renamed.
  router.get('/ticket-categories', requireSubject(), (req, res) => {
    const { q, sort } = req.query ?? {};
    res.json(
      service.listCategories(req.subject, {
        q,
        sort,
        ...readPagination(req),
      }),
    );
  });

  // Assigning and unassigning are one route: a ticket returning to nobody is
  // an assignment to nobody, not a deletion.
  router.patch('/tickets/:id/assignee', requireSubject(), (req, res) => {
    res.json(
      service.assign(req.subject, {
        id: req.params.id,
        // undefined and null are different here — undefined is a field the
        // caller forgot, null is "nobody" — so this reads the property rather
        // than defaulting it.
        assigneeId: req.body?.assigneeId,
        revision: req.body?.revision,
      }),
    );
  });

  router.patch('/tickets/:id/status', requireSubject(), (req, res) => {
    res.json(
      service.changeStatus(req.subject, {
        id: req.params.id,
        status: req.body?.status,
        revision: req.body?.revision,
        note: req.body?.note,
      }),
    );
  });

  // One ticket's trail. A missing ticket is 404; an empty history is a 200
  // with an empty page, because those are different answers.
  router.get('/tickets/:id/history', requireSubject(), (req, res) => {
    res.json(service.history(req.subject, { id: req.params.id, ...readPagination(req) }));
  });

  return router;
}
