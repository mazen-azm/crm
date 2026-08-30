import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Ticket } from '../tickets/useTicketQueue';

// One ticket, by its id.
//
// The screen resolves an id rather than being handed a ticket through the
// router: a detail screen that receives an object cannot be linked to, cannot
// be reloaded, and shows stale data the moment anything else writes to it.
//
// The same `Ticket` the desk's queue holds, because the route answers with the
// same shape — a second type for one thing would drift the day a field is
// added to only one of them.
export function useCustomerTicket(id: string) {
  const { status, data, error, run } = useRequest<Ticket>();

  const load = useCallback(() => {
    run(() => request<Ticket>(`/tickets/${id}`)).catch(() => {});
  }, [run, id]);

  useEffect(load, [load]);

  return { status, error, ticket: data, load };
}
