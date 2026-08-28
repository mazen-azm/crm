import express from 'express';

// A stranger asks whether the API is up, and health answers that and nothing
// else. No version, uptime, pid, hostname, build sha, dependency status or
// route list: each of those is a free reconnaissance answer, and none of them
// is what the caller asked.
//
// It is public by construction — it sits on the versioned router before any
// guard, so no credential is ever consulted.
export function healthRouter() {
  const router = express.Router();
  router.get('/health', (req, res) => res.json({ status: 'ok' }));
  return router;
}
