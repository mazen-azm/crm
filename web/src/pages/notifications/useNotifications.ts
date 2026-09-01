import { useCallback, useEffect, useState } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type Notification = {
  id: string;
  ticketId: string;
  kind: string;
  createdAt: string;
  readAt: string | null;
};

export type NotificationsPage = {
  items: Notification[];
  total: number;
  unread: number;
  limit: number;
  offset: number;
};

// `enabled` for the reason the audit log's hook has one: a screen that knows
// it may not read should not ask. A hook cannot be called conditionally, so
// the condition lives inside it — and `useMe` answers `undefined` before it
// answers at all, so "not yet known" must not fire a request either.
export function useNotifications({ enabled = true }: { enabled?: boolean } = {}) {
  const { status, data, error, run } = useRequest<NotificationsPage>();
  const [offset, setOffset] = useState(0);
  // The list as this screen has changed it. Marking one read answers with the
  // notification, so the row follows the answer rather than the screen asking
  // for the whole page again — which would also lose the reader's place.
  const [held, setHeld] = useState<Notification[] | null>(null);

  const read = useCallback(
    (at: number) => {
      if (!enabled) return;
      const query = at > 0 ? `?offset=${at}` : '';
      run(() => request<NotificationsPage>(`/me/notifications${query}`))
        .then(() => { setHeld(null); setOffset(at); })
        .catch(() => {});
    },
    [run, enabled],
  );

  useEffect(() => { read(0); }, [read]);

  const page = data;
  return {
    status,
    error,
    page,
    items: held ?? page?.items ?? [],
    offset,
    hasMore: page !== null && offset + page.items.length < page.total,
    // Replaces the one that changed and leaves the rest alone.
    replace: (one: Notification) =>
      setHeld((current) => (current ?? page?.items ?? []).map((n) => (n.id === one.id ? one : n))),
    load: read,
    reload: () => read(offset),
  };
}
