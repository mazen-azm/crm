import express from 'express';

import { requireSubject, requirePermission } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';
import { createIdentityService } from './identity.service.js';

// req and res stop here. The service takes values and returns values, so it
// can be tested without a server and reused from anywhere.
export function identityRouter({ db, secret, now }) {
  const service = createIdentityService({ db, secret, now });
  const router = express.Router();

  router.post('/sign-in', (req, res) => {
    res.json(service.signIn(req.body ?? {}));
  });

  // Whoever the bearer token resolves to. The guard has already refused an
  // absent or unreadable one.
  router.get('/me', requireSubject(), (req, res) => {
    res.json(req.subject);
  });

  // The role is decided here, before the service is entered. The service
  // therefore never re-checks it: one rule, one place.
  const adminOnly = requirePermission((subject) => subject.role === 'admin');

  router.post('/accounts', adminOnly, (req, res) => {
    res.status(201).json(service.createAccount(req.subject, req.body ?? {}));
  });

  router.get('/accounts', adminOnly, (req, res) => {
    res.json(service.listAccounts(req.subject, readPagination(req)));
  });

  router.patch('/accounts/:id/role', adminOnly, (req, res) => {
    res.json(service.changeRole(req.subject, { id: req.params.id, role: req.body?.role }));
  });

  router.post('/accounts/:id/disable', adminOnly, (req, res) => {
    res.json(service.disableAccount(req.subject, { id: req.params.id }));
  });

  router.post('/accounts/:id/re-enable', adminOnly, (req, res) => {
    res.json(service.reEnableAccount(req.subject, { id: req.params.id }));
  });

  return router;
}
