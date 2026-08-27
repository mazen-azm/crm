import express from 'express';

import { requestId } from './platform/http/request-id.js';
import { securityHeaders } from './platform/http/security-headers.js';
import { notFoundHandler, errorHandler } from './platform/http/errors.js';

// The composition root: every injection happens here, and nothing here
// listens. No database is opened in this story — the first feature that needs
// one imports openDatabase from './platform/db/connection.js' and receives it
// through createApp({ db }).
export function createApp(deps = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Codes are not cacheable content; an ETag on an error body invites a 304
  // that hides the actual failure.
  app.disable('etag');

  app.use(requestId());
  app.use(securityHeaders());
  // A defensive cap, not a contract — PLATFORM-6-API (CRM-21) owns real
  // request ceilings.
  app.use(express.json({ limit: '100kb' }));

  // Features mount here in a later story. Tests use the same seam to mount a
  // throwing route without polluting the production tree.
  if (typeof deps.mountTestRoutes === 'function') {
    deps.mountTestRoutes(app);
  }

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
