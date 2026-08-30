import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Ticket } from './useTicketQueue';

export type Message = {
  id: string;
  ticketId: string;
  authorId: string;
  kind: string;
  body: string;
  createdAt: string;
};

// The message AND the ticket. The route changes both — the first public reply
// on a `new` ticket opens it — and a caller told only about the message would
// have to work the rest out, which means recomputing T-2 on this side.
type Replied = { message: Message; ticket: Ticket };

export function useReply(ticketId: string) {
  const { status, error, run, reset } = useRequest<Replied>();

  const submit = useCallback(
    (body: string, onReplied: (result: Replied) => void) => {
      // A reply creates a row, so a second press is a second reply.
      if (status === 'loading') return;
      run(() =>
        request<Replied>(`/tickets/${ticketId}/replies`, {
          method: 'POST',
          body: JSON.stringify({ body }),
        }),
      )
        .then(onReplied)
        .catch(() => {});
    },
    [run, status, ticketId],
  );

  return { status, error, submit, reset };
}
