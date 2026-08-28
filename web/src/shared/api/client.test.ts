// Proves criterion 3 of scripts/criteria/platform.md section PLATFORM-9-WEB:
// the client surfaces the API's code, not a generic failure.
import { afterEach, expect, test, vi } from 'vitest';

import { request, setAuthTokenGetter } from './client';
import { ApiError } from './errors';

function answer(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// Typed, and it also asserts the call failed at all — a request that quietly
// succeeded would otherwise read as a passing assertion on undefined.
async function failureOf(run: () => Promise<unknown>): Promise<ApiError> {
  try {
    await run();
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('the request was expected to fail, and did not');
}

afterEach(() => {
  vi.restoreAllMocks();
  setAuthTokenGetter(() => null);
});

test('a documented failure arrives as its code, its status and its request id', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    answer(403, { code: 'FORBIDDEN', requestId: 'trace-1' }),
  ));

  const failure = await failureOf(() => request('/tickets'));
  expect(failure).toBeInstanceOf(ApiError);
  expect(failure.code).toBe('FORBIDDEN');
  expect(failure.status).toBe(403);
  expect(failure.requestId).toBe('trace-1');
});

test('a 422 carries the field names the API sent, and nothing else', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    answer(422, { code: 'VALIDATION_FAILED', requestId: 'r', fields: ['email', 42] }),
  ));

  const failure = await failureOf(() => request('/customers', { method: 'POST', body: '{}' }));
  expect(failure.code).toBe('VALIDATION_FAILED');
  // Names only — anything that is not a string could be a submitted value.
  expect(failure.fields).toEqual(['email']);
});

test('a failure that is not the documented shape is still a code, not a crash', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response('<html>gateway</html>', { status: 502, headers: { 'x-request-id': 'from-header' } }),
  ));

  const failure = await failureOf(() => request('/tickets'));
  expect(failure).toBeInstanceOf(ApiError);
  expect(failure.code).toBe('INTERNAL');
  expect(failure.requestId).toBe('from-header');
});

test('a request that never reaches the API is an INTERNAL with no id', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

  const failure = await failureOf(() => request('/tickets'));
  expect(failure.code).toBe('INTERNAL');
  expect(failure.status).toBe(0);
  expect(failure.requestId).toBeNull();
});

test('a success returns the body, under the versioned prefix, with the token', async () => {
  const fetchMock = vi.fn().mockResolvedValue(answer(200, { ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  setAuthTokenGetter(() => 'stub-token');

  await expect(request('/health')).resolves.toEqual({ ok: true });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/v1/health');
  expect((init.headers as Headers).get('Authorization')).toBe('Bearer stub-token');
});

test('a path that does not start with a slash is refused before any request', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(request('health')).rejects.toThrow(/must start with/);
  expect(fetchMock).not.toHaveBeenCalled();
});
