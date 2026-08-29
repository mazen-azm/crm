import express from 'express';

import { requireSubject } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';
import { createCustomersService } from './customers.service.js';

// req and res stop here. The service takes values and returns values.
export function customersRouter({ db }) {
  const service = createCustomersService({ db });
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

  return router;
}
