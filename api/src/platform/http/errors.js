// The API's error contract: every failure is JSON { code, requestId } — this
// shape is public, downstream stories add codes but must not change it (E-1:
// one shape, every failure, no stack trace).
//
// No express import: these are plain functions matching Express's signatures,
// so the terminal handler is unit-testable with two stub objects.

// E-2 (scripts/rules.txt line 28): every failure returns its documented code.
// This is the whole set — a status outside it is a bug, and the HttpError
// constructor (below) throws on it. That guard is the enforcement; one unit
// test on it is the proof.
// TODO(CHANNELS-2-API/CRM-119): 501 joins this map in that story. It owns rule
// E-3 ("named and deliberately not built"), and until the entry exists the
// constructor guard rejects new HttpError(501, ...).
export const DOCUMENTED = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
});

export class HttpError extends Error {
  constructor(status, code, cause) {
    super(code);
    // Only the status is checked. A domain-specific code at a documented
    // status stays legal — 409 CONFLICT and 409 REVISION_MISMATCH are both
    // honest answers; a 418 is not.
    if (!Object.hasOwn(DOCUMENTED, status)) {
      throw new RangeError(`HttpError: ${status} is not a documented status`);
    }
    this.status = status;
    this.code = code;
    // Kept for the structured logging that PLATFORM-6-API (CRM-21) adds; it
    // never leaves the process.
    this.cause = cause;
  }
}

// Well-formed but invalid (docs/architecture.md line 36: the schema layer
// answers 422). `fields` is a list of FIELD NAMES ONLY — never a submitted
// value. A value can be a password or personal data; it must not return to the
// client or enter a log. The constructor enforces that by keeping only
// strings. This is the one shape variation E-1 allows, and only at 422.
// Feature schema layers construct this; this story only defines it.
export class ValidationError extends HttpError {
  constructor(fields, cause) {
    super(422, 'VALIDATION_FAILED', cause);
    this.fields = Array.isArray(fields)
      ? fields.filter((f) => typeof f === 'string')
      : [];
  }
}

// A 409 that can say what would have worked. T-7 requires an illegal status
// change to name the legal ones, and { code, requestId } has nowhere to put
// them — so this adds one key for one case, exactly as ValidationError did for
// `fields`. The base shape is untouched, so E-1 holds.
//
// `allowed` being absent and being empty are DIFFERENT answers, which is why
// undefined is kept rather than flattened to []. A closed ticket has an answer
// to "what else could I have done" and the answer is "nothing"; a stale
// revision was never asked the question. Collapse the two and T-7 goes silent
// in the one case a caller most needs it.
export class ConflictError extends HttpError {
  constructor(code, allowed, cause) {
    super(409, code, cause);
    if (allowed === undefined) return;
    // Strings only, for ValidationError's reason: whatever goes in here is
    // going out to the client.
    this.allowed = Array.isArray(allowed)
      ? allowed.filter((s) => typeof s === 'string')
      : [];
  }
}

export function unprocessable(fields, cause) {
  return new ValidationError(fields, cause);
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
// Services throw HttpError, or ValidationError when input failed validation;
// this handler stays the only decider of what the client is told.
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
    const body = { code, requestId: req.id ?? null };
    if (err instanceof ValidationError && err.fields.length > 0) {
      body.fields = err.fields;
    }
    // Note this tests presence, not length, unlike the line above. An empty
    // `fields` says nothing and is left out; an empty `allowed` is the whole
    // answer and has to travel.
    if (err instanceof ConflictError && err.allowed !== undefined) {
      body.allowed = err.allowed;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(status).json(body);
  };
}
