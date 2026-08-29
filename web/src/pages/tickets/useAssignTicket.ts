import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Ticket } from './useTicketQueue';

export function useAssignTicket() {
  const { status, error, run, reset } = useRequest<Ticket>();

  // assigneeId is `null` on the wire for "nobody" — the API treats returning a
  // ticket to nobody as an ordinary assignment rather than a deletion, so null
  // is a value here and a missing field is a 422.
  const assign = useCallback(
    (ticket: Ticket, assigneeId: string | null) =>
      run(() =>
        request<Ticket>(`/tickets/${ticket.id}/assignee`, {
          method: 'PATCH',
          // The revision the caller read. BR-5: if somebody else moved the
          // ticket since this row was fetched, this is what refuses the write
          // instead of overwriting their change.
          body: JSON.stringify({ assigneeId, revision: ticket.revision }),
        }),
      ),
    [run],
  );

  return { status, error, assign, reset };
}
