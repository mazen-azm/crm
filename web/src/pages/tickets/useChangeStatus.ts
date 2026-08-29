import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Ticket } from './useTicketQueue';

// Resolving is the one move that carries a note (T-4). Every other move sends
// nothing extra, and sending a note where the rule does not ask for one is
// ignored by the API rather than stored.
export function useChangeStatus() {
  const { status, error, run, reset } = useRequest<Ticket>();

  const change = useCallback(
    (ticket: Ticket, next: string, note?: string) =>
      run(() =>
        request<Ticket>(`/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: next,
            revision: ticket.revision,
            ...(next === 'resolved' ? { note } : {}),
          }),
        }),
      ),
    [run],
  );

  return { status, error, change, reset };
}

// The same emptiness test the API applies, applied before the request. A
// round-trip to be told what the screen already knew is a worse experience for
// the same answer — and the API trims too, so '   ' is not a note there either.
export const isBlank = (note: string) => note.trim() === '';
