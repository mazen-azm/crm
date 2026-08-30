import express from 'express';

import { requirePermission, requireStaff, requireSubject } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';
import { createTicketsService } from './tickets.service.js';

// req and res stop here.
// Two guards, and the split is a decision.
//
// The desk's own routes — the queue, raising a ticket, the categories — are
// requireStaff(): a customer asking for the queue is asking for everybody's
// tickets, and SC-1 is one organisation with one queue that belongs to the
// desk.
//
// The routes under /tickets/:id keep requireSubject(), so a customer REACHES
// them and the service answers. That is deliberate: the ownership rule says a
// refusal must be the same 404 a missing ticket gets, and a 403 at the door
// would be a second, different answer to "is this ticket mine". The service is
// where the one answer lives, and ticket-ownership.guarantee.test.js reads
// these routes off the router so a new one cannot skip it.
export function ticketsRouter({ db, now }) {
  const service = createTicketsService({ db, now });
  const router = express.Router();

  // Any signed-in staff member raises a ticket for a customer. One queue —
  // there is no team or organisation to route it to (SC-1).
  router.post('/tickets', requireStaff(), (req, res) => {
    res.status(201).json(service.raise(req.subject, req.body ?? {}));
  });

  // The shared queue. Filters combine; an unknown one is refused rather than
  // ignored, and the page ceiling refuses rather than clamps (BR-4).
  router.get('/tickets', requireStaff(), (req, res) => {
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
  // Managing the list is an admin's; reading it is any staff member's, because
  // an agent who cannot see the categories cannot raise a ticket.
  const adminOnly = requirePermission((subject) => subject.role === 'admin');

  router.post('/ticket-categories', adminOnly, (req, res) => {
    res.status(201).json(service.addCategory(req.subject, { name: req.body?.name }));
  });

  router.patch('/ticket-categories/:id', adminOnly, (req, res) => {
    res.json(service.renameCategory(req.subject, { id: req.params.id, name: req.body?.name }));
  });

  router.delete('/ticket-categories/:id', adminOnly, (req, res) => {
    res.json(service.retireCategory(req.subject, { id: req.params.id }));
  });

  router.get('/ticket-categories', requireStaff(), (req, res) => {
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
  // A customer's own. Deliberately not /tickets with a different answer for a
  // different caller: the queue is the desk's and refuses a customer, and a
  // route whose meaning depended on who asked would make "what does GET
  // /tickets return" a question with two answers.
  router.get('/me/tickets', requireSubject(), (req, res) => {
    res.json(
      service.mine(req.subject, {
        status: req.query?.status,
        priority: req.query?.priority,
        categoryId: req.query?.categoryId,
        sort: req.query?.sort,
        ...readPagination(req),
      }),
    );
  });

  router.patch('/tickets/:id/category', requireSubject(), (req, res) => {
    res.json(
      service.changeCategory(req.subject, {
        id: req.params.id,
        categoryId: req.body?.categoryId,
        revision: req.body?.revision,
      }),
    );
  });

  router.get('/tickets/:id/history', requireSubject(), (req, res) => {
    res.json(service.history(req.subject, { id: req.params.id, ...readPagination(req) }));
  });

  return router;
}
