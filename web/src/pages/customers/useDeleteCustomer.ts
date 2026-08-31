import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

// The delete answers with the moment it happened, so a caller need not read it
// back. This screen does not use it — it leaves — but the hook returns what
// the route returns rather than throwing the answer away.
type Deleted = { id: string; deletedAt: string };

export function useDeleteCustomer(id: string) {
  const { status, error, run, reset } = useRequest<Deleted>();

  const remove = useCallback(
    () => run(() => request<Deleted>(`/customers/${id}`, { method: 'DELETE' })),
    [run, id],
  );

  return { status, error, remove, reset };
}
