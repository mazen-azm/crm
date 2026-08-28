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
  | 'INTERNAL';

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

  constructor(init: {
    status: number;
    code: string;
    requestId: string | null;
    fields?: string[];
  }) {
    super(init.code);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    if (init.fields) this.fields = init.fields;
  }
}
