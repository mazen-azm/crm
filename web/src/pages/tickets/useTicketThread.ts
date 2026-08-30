import { useCallback, useState } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Message } from './useReply';

export type ThreadPage = {
  items: Message[];
  total: number;
  limit: number;
  offset: number;
};

// The same shape as useTicketHistory, for the same reason: one answer lives in
// the request hook, and a list that grows by "load more" needs the pages before
// it too.
export function useTicketThread(ticketId: string) {
  const { status, data, error, run } = useRequest<ThreadPage>();
  const [messages, setMessages] = useState<Message[]>([]);

  const read = useCallback(
    (offset: number) => {
      if (status === 'loading') return;
      // No limit parameter: BR-4 puts the ceiling on the server, and a screen
      // naming a page size would be a second answer to how big a page is.
      const query = offset > 0 ? `?offset=${offset}` : '';
      run(() => request<ThreadPage>(`/tickets/${ticketId}/messages${query}`))
        .then((page) => {
          setMessages((held) => (offset === 0 ? page.items : [...held, ...page.items]));
        })
        .catch(() => {});
    },
    [run, status, ticketId],
  );

  const page = data;
  const more = page !== null && messages.length < page.total;

  return {
    status,
    error,
    messages,
    total: page?.total ?? 0,
    more,
    load: useCallback(() => read(0), [read]),
    loadMore: useCallback(() => read(messages.length), [read, messages.length]),
  };
}
