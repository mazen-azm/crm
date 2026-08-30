import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

// What the grant answers with. The password is here once and nowhere else —
// no route reads it back, and this hook does not persist it. When the screen
// unmounts it is gone, which is the contract rather than an oversight.
export type GrantedSignIn = {
  customer: { id: string; name: string; email: string | null; hasSignIn: boolean };
  user: { id: string; email: string; name: string; role: string };
  initialPassword: string;
};

export function useGrantSignIn(customerId: string) {
  const { status, data, error, run } = useRequest<GrantedSignIn>();

  const grant = useCallback(() => {
    // The disabled button is the first guard; this is the one a keyboard
    // repeat meets. The API refuses a second grant with a 409 anyway, so the
    // worst case is an error where there should be none — but an agent
    // reading a password aloud does not need a refusal on the screen.
    if (status === 'loading') return;
    run(() => request<GrantedSignIn>(`/customers/${customerId}/sign-in`, { method: 'POST' })).catch(
      () => {},
    );
  }, [customerId, run, status]);

  return { status, error, granted: data, grant };
}
