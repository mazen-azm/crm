import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

type Set = { id: string; updatedAt: string };

export function useSetUserPassword() {
  const { status, data, error, run, reset } = useRequest<Set>();

  const submit = useCallback(
    (input: { userId: string; password: string }) => {
      if (status === 'loading') return;
      run(() =>
        request<Set>(`/accounts/${input.userId}/set-password`, {
          method: 'POST',
          body: JSON.stringify({ password: input.password }),
        }),
      ).catch(() => {});
    },
    [run, status],
  );

  return { status, error, done: data, submit, reset };
}
