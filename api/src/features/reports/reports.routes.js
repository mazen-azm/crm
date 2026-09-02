import express from 'express';

import { requirePermission } from '../../platform/http/permission.js';

// req and res stop here. The reader takes values and returns values.
export function reportsRouter({ queueByStatus, promiseShare }) {
  // Admin only, decided before the reader runs. A report is about how the
  // whole desk is doing, which is not something one agent should be able to
  // read about the others — the same reasoning the audit trail uses, and
  // staff-only.guarantee.test.js reads this route off the router and holds it
  // to it.
  const adminOnly = requirePermission((subject) => subject.role === 'admin');

  const router = express.Router();

  // Six numbers whose size does not grow with the desk. BR-4's page ceiling is
  // a rule about lists, so there is no readPagination here — the rule applies
  // to a report's inputs, and this one has none yet.
  router.get('/reports/queue-by-status', adminOnly, (req, res) => {
    res.json(queueByStatus.read(req.subject));
  });

  // Two counts and a share per kind. A GET, and it stays one: the breach rows
  // it reads are written by POST /tickets/sweep-breaches, and a report that ran
  // the sweep so its own number looked current would be a read that writes.
  router.get('/reports/promise-share', adminOnly, (req, res) => {
    res.json(promiseShare.read(req.subject));
  });

  return router;
}
