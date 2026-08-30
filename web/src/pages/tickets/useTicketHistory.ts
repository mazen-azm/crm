import { useCallback, useState } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

// One entry of the trail, as the API returns it. `actorId` and not an actor
// object: the route answers with ids, the same way the queue answers with an
// assignee id, and the screen that needs names is the one holding the staff
// list. A null actor is the system.
//
// `before` and `after` are the audit row's diff, parsed by the API. Their keys
// depend on the verb — { status } for a move, { assigneeId } for an
// assignment — so they are read by key and never enumerated.
export type HistoryEntry = {
  id: string;
  actorId: string | null;
  verb: string;
  at: string;
  before: Record<string, string | null> | null;
  after: Record<string, string | null> | null;
};

export type HistoryPage = {
  items: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
};

export function useTicketHistory(ticketId: string) {
  const { status, data, error, run } = useRequest<HistoryPage>();
  // Every page read so far, in the order the API gave them. The request hook
  // holds one answer; a trail that grows by "load more" needs the ones before
  // it too, and appending here keeps the hook's single-answer shape intact.
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const read = useCallback(
    (offset: number) => {
      if (status === 'loading') return;
      // No limit parameter. The window is the API's — asking for one here
      // would be the screen inventing a page size, and BR-4 puts that ceiling
      // on the server. The answer says what it gave.
      const query = offset > 0 ? `?offset=${offset}` : '';
      run(() => request<HistoryPage>(`/tickets/${ticketId}/history${query}`))
        .then((page) => {
          setEntries((held) => (offset === 0 ? page.items : [...held, ...page.items]));
        })
        .catch(() => {});
    },
    [run, status, ticketId],
  );

  const page = data;
  // Whether anything is left, from the API's own numbers rather than from a
  // guess about page size: what it has handed over so far, against the total
  // it reported.
  const more = page !== null && entries.length < page.total;

  return {
    status,
    error,
    entries,
    total: page?.total ?? 0,
    more,
    load: useCallback(() => read(0), [read]),
    loadMore: useCallback(() => read(entries.length), [read, entries.length]),
  };
}
