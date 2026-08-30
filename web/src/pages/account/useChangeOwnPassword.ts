import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

type Changed = { id: string; updatedAt: string };

export function useChangeOwnPassword() {
  const { status, error, run, reset } = useRequest<Changed>();

  const submit = useCallback(
    (input: { currentPassword: string; newPassword: string }) => {
      if (status === 'loading') return;
      run(() =>
        request<Changed>('/me/password', { method: 'POST', body: JSON.stringify(input) }),
      ).catch(() => {});
    },
    [run, status],
  );

  // The session is deliberately untouched. The API does not rotate the token
  // on this call and neither does this: a person who changes their password
  // should not be thrown back to sign-in for doing the safe thing. Ending
  // OTHER sessions is IDENTITY-8-API, and until it ships the tokens issued
  // before the change stay valid.
  return { status, error, submit, reset };
}
