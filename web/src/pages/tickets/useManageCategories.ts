import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { TicketCategory } from './useTicketCategories';

// The three writes, each its own request state.
//
// One hook per action rather than one hook with a verb parameter: the screen
// shows a rename failing on the row being renamed and an add failing under the
// add form, and a shared state would put one message in both places or in
// neither.
export function useAddCategory() {
  const { status, error, run, reset } = useRequest<TicketCategory>();
  const add = useCallback(
    (name: string) =>
      run(() =>
        request<TicketCategory>('/ticket-categories', {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),
      ),
    [run],
  );
  return { status, error, add, reset };
}

export function useRenameCategory() {
  const { status, error, run, reset } = useRequest<TicketCategory>();
  const rename = useCallback(
    (id: string, name: string) =>
      run(() =>
        request<TicketCategory>(`/ticket-categories/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        }),
      ),
    [run],
  );
  // Which row is being renamed, so a failure marks that row and not the list.
  return { status, error, rename, reset };
}

export function useRetireCategory() {
  const { status, error, run, reset } = useRequest<{ id: string; retiredAt: string }>();
  const retire = useCallback(
    (id: string) => run(() => request<{ id: string; retiredAt: string }>(`/ticket-categories/${id}`, { method: 'DELETE' })),
    [run],
  );
  return { status, error, retire, reset };
}
