import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Message } from './useReply';

export type ThreadPage = {
  items: Message[];
  total: number;
  limit: number;
  offset: number;
};

// One page at a time, replaced rather than grown — the shape MyTicketsPage
// established, and the one this story's criterion needs: a reader who can only
// go forwards from the oldest message cannot be landed on the newest.
//
// It was the other shape until now, and the other shape was wrong in a way no
// test saw: it appended at `offset = messages.length`, which in an oldest-first
// thread is the NEWER page, behind a button that said "Show older messages".
//
// No `limit` is sent. The window is the API's (BR-4), and the step comes from
// the `limit` the answer reports — so the screen never names a page size, and
// the arithmetic uses the number the server actually used rather than one the
// screen hopes it used.
export function useTicketThread(ticketId: string) {
  const { status, data, error, run } = useRequest<ThreadPage>();

  const read = useCallback(
    (offset: number) => {
      const query = offset > 0 ? `?offset=${offset}` : '';
      return run(() => request<ThreadPage>(`/tickets/${ticketId}/messages${query}`));
    },
    [run, ticketId],
  );

  // The offset of the last page, from the answer's own numbers. `total - 1`
  // rather than `total`: a thread of exactly two pages ends at offset `limit`,
  // and `total / limit` would send it to a page past the end.
  const lastOffset = (page: ThreadPage) =>
    page.total === 0 ? 0 : Math.floor((page.total - 1) / page.limit) * page.limit;

  // Opening lands on the newest, because that is what somebody opening a thread
  // came for. It costs a second request on a long thread — `total` is not
  // knowable before the first answer, and the API has no "last page" shortcut —
  // and nothing on a thread that fits one page.
  const load = useCallback(
    () =>
      read(0)
        .then((page) => (lastOffset(page) > 0 ? read(lastOffset(page)) : page))
        .catch(() => {}),
    [read],
  );

  const page = data;
  const step = (by: number) => {
    if (!page) return;
    read(Math.max(0, page.offset + by * page.limit)).catch(() => {});
  };

  return {
    status,
    error,
    page,
    messages: page?.items ?? [],
    // Whether this page holds the newest message. Not "offset === lastOffset":
    // a thread that grew since the page was read has moved its last offset, and
    // what the reader can see is the question being asked.
    atNewest: page !== null && page.offset + page.items.length >= page.total,
    atOldest: page !== null && page.offset === 0,
    load,
    previous: useCallback(() => step(-1), [page]),
    next: useCallback(() => step(1), [page]),
    toNewest: useCallback(() => {
      if (page) read(lastOffset(page)).catch(() => {});
    }, [page, read]),
  };
}
