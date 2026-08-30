import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Ticket } from '../tickets/useTicketQueue';

export const PAGE_SIZE = 25;

type Page = { items: Ticket[]; total: number; limit: number; offset: number };

// A customer's own tickets. /me/tickets, not /tickets: the queue is the desk's
// and refuses a customer, which is the API's rule and not this screen's
// courtesy.
export function useMyTickets() {
  const { status, data, error, run } = useRequest<Page>();

  const read = useCallback(
    (offset = 0) => {
      run(() => request<Page>(`/me/tickets?limit=${PAGE_SIZE}&offset=${offset}`)).catch(() => {});
    },
    [run],
  );

  useEffect(() => {
    read(0);
  }, [read]);

  return { status, error, page: data, read };
}
