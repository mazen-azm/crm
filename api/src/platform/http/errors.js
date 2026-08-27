// The API's error contract: every failure is JSON { code, requestId } — this
// shape is public, downstream stories add codes but must not change it (E-1:
// one shape, every failure, no stack trace).
//
// No express import: these are plain functions matching Express's signatures,
// so the terminal handler is unit-testable with two stub objects.

export class HttpError extends Error {
  constructor(status, code, cause) {
    super(code);
    this.status = status;
    this.code = code;
    // Kept for the structured logging that PLATFORM-6-API (CRM-21) adds; it
    // never leaves the process.
    this.cause = cause;
  }
}

// The only way an unknown route becomes an error — so a 404 wears exactly the
// same shape as every other failure.
export function notFoundHandler() {
  return (req, res, next) => next(new HttpError(404, 'NOT_FOUND'));
}

// The one place a status code is decided. Anything that is not an HttpError is
// coerced to 500/INTERNAL on purpose: an unrecognised error is exactly the one
// whose message must not reach a client.
//
// TODO(PLATFORM-5-API/CRM-20): the per-endpoint code catalogue (400 401 403
// 404 409 422 429 500) plugs in by services throwing HttpError; this handler
// stays untouched.
export function errorHandler() {
  return (err, req, res, next) => {
    if (res.headersSent) {
      // A body is already on the wire; Express's finaliser closes the socket.
      // This is the one path whose shape this middleware does not decide.
      next(err);
      return;
    }
    const known = err instanceof HttpError;
    const status = known ? err.status : 500;
    const code = known ? err.code : 'INTERNAL';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(status).json({ code, requestId: req.id ?? null });
  };
}
