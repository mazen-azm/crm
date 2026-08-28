import express from 'express';

import { requireSubject } from '../../platform/http/permission.js';
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

  return router;
}
