import express from 'express';

import { requireStaff } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';

// req and res stop here. The service takes values and returns values.
export function notificationsRouter({ service }) {
  const router = express.Router();

  // Under /me, like every other route about the person asking: /me,
  // /me/password, /me/tickets. A route that took a user id would be a route
  // somebody could put another id into, and then the ownership rule would have
  // to be written rather than being true by construction.
  //
  // requireStaff: nothing writes a notification for a customer, so there is
  // nothing here for one to read. Saying so with a guard is clearer than an
  // empty list that looks like a bug.
  router.get('/me/notifications', requireStaff(), (req, res) => {
    res.json(service.mine(req.subject, { filter: req.query?.filter, ...readPagination(req) }));
  });

  router.post('/me/notifications/:id/read', requireStaff(), (req, res) => {
    res.json(service.read(req.subject, { id: req.params.id }));
  });

  return router;
}
