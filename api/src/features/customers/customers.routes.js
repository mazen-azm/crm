import express from 'express';

import { requireSubject } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';
import { createCustomersService } from './customers.service.js';

// req and res stop here. The service takes values and returns values.
export function customersRouter({ db, now, tickets }) {
  const service = createCustomersService({ db, tickets, now });
  const router = express.Router();

  // Any signed-in staff member, not adminOnly: an agent who cannot find a
  // customer cannot answer the phone.
  router.get('/customers', requireSubject(), (req, res) => {
    res.json(
      service.search(req.subject, {
        term: req.query?.q,
        ...readPagination(req),
      }),
    );
  });

  // Notes are paginated like every other list here. BR-4 is global — no
  // unbounded list — and it does not stop applying because this story's
  // criteria happen to talk about order instead.
  // One customer, whole: their details, the tickets the desk still owes them
  // something on, and the notes. One request, one transaction, one moment.
  router.get('/customers/:id', requireSubject(), (req, res) => {
    res.json(service.read(req.subject, { id: req.params.id, ...readPagination(req) }));
  });

  // Adding a customer is a write and answers 201 with the customer it made,
  // the way raising a ticket does — a message saying it worked cannot be read
  // back, and the caller needs the id.
  router.post('/customers', requireSubject(), (req, res) => {
    res.status(201).json(service.create(req.subject, req.body ?? {}));
  });

  router.get('/customers/:id/notes', requireSubject(), (req, res) => {
    res.json(
      service.listNotes(req.subject, {
        customerId: req.params.id,
        ...readPagination(req),
      }),
    );
  });

  router.post('/customers/:id/notes', requireSubject(), (req, res) => {
    res.status(201).json(
      service.writeNote(req.subject, {
        customerId: req.params.id,
        body: req.body?.body,
      }),
    );
  });

  return router;
}
