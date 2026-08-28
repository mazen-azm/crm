import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// The document is an artefact in the repo, read once at module load: it does
// not change between requests, and reading it per request would let a
// half-written file be served while an editor saves.
//
// A malformed document therefore throws the moment app.js is imported, and
// every test goes red at once. That is the failure mode worth having — a
// contract that 500s quietly is worse than one that refuses to start.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOC_PATH = path.resolve(HERE, '../../../openapi.json');

export const OPENAPI_DOCUMENT = JSON.parse(readFileSync(DOC_PATH, 'utf8'));

export function openapiRouter() {
  const router = express.Router();
  // The route documents itself. That entry is what proves the walker and the
  // prefix agree: if either drifts, the contract test names the missing route.
  router.get('/openapi.json', (req, res) => res.json(OPENAPI_DOCUMENT));
  return router;
}
