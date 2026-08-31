import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Ticket } from './useTicketQueue';

export function useChangeCategory() {
  const { status, error, run, reset } = useRequest<Ticket>();

  // categoryId is `null` on the wire for "no category" — the same shape
  // assignment uses for nobody. A value rather than a missing field, because
  // taking a category off a ticket is an ordinary change and not a deletion,
  // and an omitted field is a 422.
  const change = useCallback(
    (ticket: Ticket, categoryId: string | null) =>
      run(() =>
        request<Ticket>(`/tickets/${ticket.id}/category`, {
          method: 'PATCH',
          // BR-5, the same as every other write on this row: the revision that
          // was read. If somebody else changed the ticket since, this refuses
          // rather than overwrites.
          body: JSON.stringify({ categoryId, revision: ticket.revision }),
        }),
      ),
    [run],
  );

  return { status, error, change, reset };
}
