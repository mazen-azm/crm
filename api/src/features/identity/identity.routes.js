import express from 'express';

import { requireSubject, requirePermission, requireStaff } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';

// req and res stop here. The service takes values and returns values, so it
// can be tested without a server and reused from anywhere.
// The service is handed in rather than built here, for the reason
// customersRouter's is: CUSTOMERS-6-API needs the same instance to create a
// customer's user row inside its own transaction, and two instances would be
// two answers to what the identity service is.
export function identityRouter({ service }) {
  const router = express.Router();

  // req.ip is the socket peer: app.js sets no `trust proxy`, by decision, so
  // behind a reverse proxy every caller would look like the proxy and the
  // address ceiling would throttle the whole world at once. Wiring proxy trust
  // from configuration belongs to a platform story, not to this one.
  router.post('/sign-in', (req, res) => {
    res.json(service.signIn(req.body ?? {}, { address: req.ip ?? null }));
  });

  // Whoever the bearer token resolves to. The guard has already refused an
  // absent or unreadable one.
  router.get('/me', requireSubject(), (req, res) => {
    res.json(req.subject);
  });

  // Named for the question the caller is asking rather than for the users
  // table, so it will not be confused with /accounts — which is admin-only and
  // answers a different question with a wider row.
  router.get('/assignees', requireStaff(), (req, res) => {
    res.json(service.listAssignees(req.subject, readPagination(req)));
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

  // An admin sets somebody else's password. Not their own: that is a different
  // route with a different question, and this one never asks for a current
  // password because the person it is for cannot supply one.
  router.post('/accounts/:id/set-password', adminOnly, (req, res) => {
    res.json(service.setPassword(req.subject, { id: req.params.id, password: req.body?.password }));
  });

  return router;
}
