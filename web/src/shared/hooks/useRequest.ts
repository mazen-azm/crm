import { useCallback, useRef, useState } from 'react';

import { ApiError } from '../api/errors';

// This hook is the only place a web screen expresses loading. A screen that
// reimplements it is a bug — acceptance criterion 4 of PLATFORM-9-WEB.
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export function useRequest<T>() {
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  // A monotonic ticket per call: a slow first request that resolves after a
  // fast second one must not overwrite the newer answer.
  const latest = useRef(0);

  const run = useCallback(async (task: () => Promise<T>): Promise<T> => {
    const ticket = ++latest.current;
    setStatus('loading');
    setError(null);
    try {
      const result = await task();
      if (ticket === latest.current) {
        setData(result);
        setStatus('success');
      }
      return result;
    } catch (cause) {
      // Anything that is not an ApiError still has to arrive as one, so a
      // screen can always read error.code without a type check.
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError({ status: 0, code: 'INTERNAL', requestId: null });
      if (ticket === latest.current) {
        setError(failure);
        setStatus('error');
      }
      throw failure;
    }
  }, []);

  return { status, data, error, run };
}
