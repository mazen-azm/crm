// A mirror of the API's frozen catalogue. The source of truth is DOCUMENTED in
// api/src/platform/http/errors.js — when a code is added there, it is added
// here in the same commit, and the OpenAPI check on the server side is what
// keeps the routes honest.
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  // 501. Named, and deliberately not built — the API says so about a channel
  // it knows and has decided against (E-3). Here because this file mirrors the
  // API's frozen catalogue and the two move in one commit; and because
  // t.errors is `satisfies Record<ApiErrorCode, string>`, so a code with no
  // sentence is a compile error rather than a screen showing nothing.
  | 'NOT_IMPLEMENTED'
  // The API sends a domain code at a documented status where the status alone
  // would not say enough — errors.js puts it as "409 CONFLICT and 409
  // REVISION_MISMATCH are both honest answers". These three are the ones it
  // sends today, all 409s from tickets. They belong in this union because
  // t.errors is `satisfies Record<ApiErrorCode, string>`: with the code named
  // here, a missing sentence is a compile error instead of a screen that
  // quietly reports somebody else's edit as our server failing.
  | 'REVISION_MISMATCH'
  | 'ILLEGAL_TRANSITION'
  | 'STATUS_UNCHANGED';

// The client surfaces the code. It does not translate it into a sentence —
// that is the translations story's job, and a generic "something went wrong"
// throws away the only thing the API promised to tell us.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  // Field NAMES only, never a submitted value: the API refuses to send values
  // and the client has no business inventing them.
  readonly fields?: string[];
  // The statuses that WOULD have been legal, on a refused status change. An
  // empty array is an answer — "nothing would have worked", which is what a
  // closed ticket says — and an absent one means the question does not arise,
  // as on a stale revision. The two are kept apart here for the same reason
  // the API keeps them apart.
  readonly allowed?: string[];

  constructor(init: {
    status: number;
    code: string;
    requestId: string | null;
    fields?: string[];
    allowed?: string[];
  }) {
    super(init.code);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    if (init.fields) this.fields = init.fields;
    // Presence, not truthiness: [] must survive.
    if (init.allowed !== undefined) this.allowed = init.allowed;
  }
}
