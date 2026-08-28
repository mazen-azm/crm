import express from 'express';

import { requestId } from './platform/http/request-id.js';
import { securityHeaders } from './platform/http/security-headers.js';
import { notFoundHandler, errorHandler } from './platform/http/errors.js';
import { attachSubject } from './platform/http/permission.js';
import { jsonBodyErrors } from './platform/http/json-errors.js';
import { requestLogger } from './platform/http/request-logger.js';
import { healthRouter } from './platform/http/health.js';
import { openapiRouter } from './platform/http/openapi.js';
import { API_V1_PREFIX } from './platform/http/prefix.js';

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
  // Registered on the top-level app and before the mount, so one line is
  // logged for a served route and for an off-prefix miss alike.
  app.use(requestLogger(deps.logger));
  // A byte cap on the body, which is a different question from the page
  // ceiling: readPagination owns how many rows one page may carry.
  app.use(express.json({ limit: '100kb' }));
  // An error-handling middleware, so it runs only when the parser rejects a
  // body. On the happy path Express skips it.
  app.use(jsonBodyErrors());

  // The permission seam: every request past this line carries req.subject —
  // the authenticated subject, or null. The default resolver is null-only, so
  // a feature that forgets its guard 401s instead of silently succeeding.
  // IDENTITY-1-API (CRM-41) supplies the real resolver.
  app.use(attachSubject(deps.subjectResolver));

  // The version is a mount, not a string every route repeats. Features are
  // added to this router and never write /api/v1 themselves; moving the API
  // to v2 later moves one line.
  const v1 = express.Router();
  v1.use(healthRouter());
  v1.use(openapiRouter());
  // Features mount here. app.js imports none of them by name — a feature
  // arrives through deps, so the composition root stays platform-only and a
  // test can build an app with no features at all.
  if (typeof deps.mountFeatures === 'function') {
    deps.mountFeatures(v1);
  }
  // Tests use this seam to mount a throwing route without polluting the
  // production tree. It stays after the features so a test can shadow one.
  if (typeof deps.mountTestRoutes === 'function') {
    deps.mountTestRoutes(v1);
  }
  app.use(API_V1_PREFIX, v1);

  // Anything off the prefix falls through to here and gets the documented 404.
  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
