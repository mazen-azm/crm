import { HttpError } from './errors.js';

// express.json() rejects a bad body with a SyntaxError carrying
// err.type === 'entity.parse.failed'. It is not an HttpError, so without this
// it reaches errorHandler as an unknown error and becomes 500. E-2 says a
// malformed body is a client fault: 400.
//
// Charset and encoding faults are the same class of "we could not read what
// you sent" and map here too. A too-large body (entity.too.large) is NOT
// remapped: the body ceiling and the answer it deserves are
// PLATFORM-6-API (CRM-21)'s contract, and 413 is not one of the eight
// documented statuses. Until that story, it still falls through to 500.
const MALFORMED = new Set([
  'entity.parse.failed',
  'charset.unsupported',
  'encoding.unsupported',
]);

export function jsonBodyErrors() {
  return (err, _req, _res, next) => {
    if (err && MALFORMED.has(err.type)) {
      next(new HttpError(400, 'MALFORMED_BODY', err));
      return;
    }
    next(err);
  };
}
