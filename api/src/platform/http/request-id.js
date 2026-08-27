import { randomUUID } from 'node:crypto';

// Every request carries an id, and the client may supply its own so a failure
// can be traced across systems. An echoed header is also an injection surface,
// so an incoming value is accepted only when it stays inside a narrow alphabet
// and a sane length — anything else is replaced, not sanitised: a partly
// trusted id is worse than a fresh one.
const WELL_FORMED = /^[A-Za-z0-9._-]+$/;
const MAX_LENGTH = 200;

export function requestId() {
  return (req, res, next) => {
    const incoming = req.get('X-Request-Id');
    const accepted =
      typeof incoming === 'string' &&
      incoming.length > 0 &&
      incoming.length <= MAX_LENGTH &&
      WELL_FORMED.test(incoming);

    req.id = accepted ? incoming : randomUUID();
    // Set before next() so every later middleware — the error handler
    // included — can read the id from req or from the response headers.
    res.setHeader('X-Request-Id', req.id);
    next();
  };
}
