import { API_BASE_URL } from './base-url';
import { ApiError } from './errors';

// The token getter is registered by the auth context on mount. Keeping it a
// plain function means this module imports no React and can be used from
// anywhere, including a test with no provider around it.
let readToken: () => string | null = () => null;

export function setAuthTokenGetter(getter: () => string | null): void {
  readToken = getter;
}

// The app layer registers what should happen when the API stops accepting our
// token. This module reports; it does not navigate and does not touch storage,
// because doing either would mean importing from app/ — and shared/ reaching
// upward is a violation verify-architecture.mjs fails by name. Same shape as
// the token getter above, for the same reason.
type UnauthenticatedHandler = (error: ApiError) => void;
let onUnauthenticated: UnauthenticatedHandler = () => {};

export function setUnauthenticatedHandler(handler: UnauthenticatedHandler): void {
  onUnauthenticated = handler;
}

// And what should happen when the API hands back a token that REPLACES the one
// we are holding. Changing a password ends every session issued before it —
// this one included — so the answer to that call carries its successor, and
// something has to store it or the next request is a 401 for doing the safe
// thing.
//
// The same inversion as the two above, for the same reason: storing a token
// means touching the auth context, which lives in app/, and a hook under
// pages/ reaching up to it is a violation verify-architecture.mjs fails by
// name. The caller announces; the app layer decides what storing means.
type TokenReplacedHandler = (token: string) => void;
let onTokenReplaced: TokenReplacedHandler = () => {};

export function setTokenReplacedHandler(handler: TokenReplacedHandler): void {
  onTokenReplaced = handler;
}

export function announceReplacementToken(token: string): void {
  onTokenReplaced(token);
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  // A caller that expects a 401 as a normal answer says so here. Only sign-in
  // does — an option rather than sniffing the path, so the exemption sits at
  // the call site where a reviewer meets it.
  { suppressSessionExpiry = false }: { suppressSessionExpiry?: boolean } = {},
): Promise<T> {
  if (!path.startsWith('/')) {
    throw new Error(`request(): path must start with "/", got "${path}"`);
  }

  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = readToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    // The request never reached the API, so there is no code to surface and
    // no request id to trace. Say so in the same shape as everything else.
    throw new ApiError({ status: 0, code: 'INTERNAL', requestId: null });
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  // Read the failure defensively: a proxy or a crash can answer with
  // something that is not the documented shape, and the client still has to
  // produce an ApiError rather than a parse exception.
  const requestId = response.headers.get('x-request-id');
  let body: { code?: unknown; requestId?: unknown; fields?: unknown; allowed?: unknown } = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  const error = new ApiError({
    status: response.status,
    code: typeof body.code === 'string' ? body.code : 'INTERNAL',
    requestId: typeof body.requestId === 'string' ? body.requestId : requestId,
    fields: Array.isArray(body.fields) ? body.fields.filter((f): f is string => typeof f === 'string') : undefined,
    // Parsed the same defensive way, but kept when empty: on a closed ticket
    // the whole answer is [].
    allowed: Array.isArray(body.allowed)
      ? body.allowed.filter((s): s is string => typeof s === 'string')
      : undefined,
  });

  // A 401 from the sign-in request is a wrong password, not an expired
  // session: IDENTITY-1-API answers the same 401 for a wrong password, an
  // unknown address and a disabled account, on purpose. Treating that as an
  // expiry would clear a session that does not exist, redirect a reader who is
  // already on sign-in, and wipe the message they were meant to read.
  // The next person adding a global 401 handler will read this. Leave it here.
  if (error.status === 401 && !suppressSessionExpiry) onUnauthenticated(error);

  throw error;
}
