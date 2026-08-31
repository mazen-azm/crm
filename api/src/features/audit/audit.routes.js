import express from 'express';

import { requirePermission } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';

// req and res stop here. The service takes values and returns values.
export function auditRouter({ reader }) {
  // Admin only. The trail says what everybody did, which is not something one
  // agent should be able to read about another — and BR-2's promise is to the
  // person answerable for the desk, not to everybody on it.
  const adminOnly = requirePermission((subject) => subject.role === 'admin');

  const router = express.Router();

  // Named after the table, the way /ticket-categories is. `/audit` alone would
  // read as a verb.
  router.get('/audit-events', adminOnly, (req, res) => {
    res.json(
      reader.read(req.subject, {
        // Absent stays absent: `??` would turn a missing filter into null and
        // null is a value this query can be asked about.
        actorId: req.query?.actorId,
        entity: req.query?.entity,
        entityId: req.query?.entityId,
        from: req.query?.from,
        to: req.query?.to,
        ...readPagination(req),
      }),
    );
  });

  return router;
}
