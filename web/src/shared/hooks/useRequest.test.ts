// Proves criterion 4 of scripts/criteria/platform.md section PLATFORM-9-WEB:
// the loading state is observable, and it lives in one hook every screen uses.
import { expect, test } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useRequest } from './useRequest';
import { ApiError } from '../api/errors';

test('a request is idle, then loading, then success — each state observable', async () => {
  const { result } = renderHook(() => useRequest<string>());
  expect(result.current.status).toBe('idle');

  let release: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => {
    release = resolve;
  });

  act(() => {
    void result.current.run(() => pending);
  });
  await waitFor(() => expect(result.current.status).toBe('loading'));

  await act(async () => {
    release('done');
    await pending;
  });
  expect(result.current.status).toBe('success');
  expect(result.current.data).toBe('done');
});

test('a failure ends in error, carrying the code the API gave', async () => {
  const { result } = renderHook(() => useRequest<string>());

  await act(async () => {
    await result.current
      .run(() => Promise.reject(new ApiError({ status: 409, code: 'CONFLICT', requestId: 'r' })))
      .catch(() => {});
  });

  expect(result.current.status).toBe('error');
  expect(result.current.error?.code).toBe('CONFLICT');
});

test('a throw that is not an ApiError still arrives as one', async () => {
  const { result } = renderHook(() => useRequest<string>());

  await act(async () => {
    await result.current.run(() => Promise.reject(new TypeError('boom'))).catch(() => {});
  });

  expect(result.current.error).toBeInstanceOf(ApiError);
  expect(result.current.error?.code).toBe('INTERNAL');
});

test('a slow answer that arrives after a newer one is dropped', async () => {
  const { result } = renderHook(() => useRequest<string>());

  let releaseSlow: (v: string) => void = () => {};
  const slow = new Promise<string>((r) => {
    releaseSlow = r;
  });

  act(() => {
    void result.current.run(() => slow);
  });
  await act(async () => {
    await result.current.run(() => Promise.resolve('newer'));
  });
  expect(result.current.data).toBe('newer');

  await act(async () => {
    releaseSlow('older');
    await slow;
  });
  // The stale answer must not overwrite the newer one.
  expect(result.current.data).toBe('newer');
});
