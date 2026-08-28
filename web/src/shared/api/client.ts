import { API_BASE_URL } from './base-url';
import { ApiError } from './errors';

// The token getter is registered by the auth context on mount. Keeping it a
// plain function means this module imports no React and can be used from
// anywhere, including a test with no provider around it.
let readToken: () => string | null = () => null;

export function setAuthTokenGetter(getter: () => string | null): void {
  readToken = getter;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  let body: { code?: unknown; requestId?: unknown; fields?: unknown } = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  throw new ApiError({
    status: response.status,
    code: typeof body.code === 'string' ? body.code : 'INTERNAL',
    requestId: typeof body.requestId === 'string' ? body.requestId : requestId,
    fields: Array.isArray(body.fields) ? body.fields.filter((f): f is string => typeof f === 'string') : undefined,
  });
}
