import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Note } from './useCustomer';

// The same emptiness test the API applies, applied before the request. The
// rules layer trims and refuses, so '   ' is not a note there either — and a
// round-trip to be told what the screen already knew is a worse experience for
// the same answer.
export const isBlank = (body: string) => body.trim() === '';

export function useWriteNote(customerId: string) {
  const { status, error, run } = useRequest<Note>();

  const write = useCallback(
    (body: string) =>
      run(() =>
        request<Note>(`/customers/${customerId}/notes`, {
          method: 'POST',
          body: JSON.stringify({ body }),
        }),
      ),
    [run, customerId],
  );

  return { status, error, write };
}
