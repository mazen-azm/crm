import { useCallback } from 'react';

import { announceReplacementToken, request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

// `token` is the one that replaces the session this change just ended.
type Changed = { id: string; updatedAt: string; token: string };

export function useChangeOwnPassword() {
  const { status, error, run, reset } = useRequest<Changed>();

  const submit = useCallback(
    (input: { currentPassword: string; newPassword: string }) => {
      if (status === 'loading') return;
      run(() =>
        request<Changed>('/me/password', { method: 'POST', body: JSON.stringify(input) }),
      )
        .then(({ token }) => {
          // The session held here was issued under the old password, and
          // IDENTITY-8-API stops accepting it the moment the change lands —
          // this device included. So the token the answer carries replaces it.
          //
          // This is what keeps "every OTHER session" true from where somebody
          // is sitting. Without it, changing your own password signs you out
          // for doing the safe thing, and the next request 401s.
          //
          // Announced rather than stored here. Storing means the auth
          // context, which lives in app/, and a hook under pages/ importing
          // upward is a layer violation the architecture check fails by name —
          // so this uses the same inversion the token getter and the
          // session-expiry handler already use.
          if (token) announceReplacementToken(token);
        })
        .catch(() => {});
    },
    [run, status],
  );

  return { status, error, submit, reset };
}
