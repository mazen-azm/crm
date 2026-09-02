import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

// The six statuses, in the order a ticket travels them. Mirrors STATUSES in
// api/src/features/tickets/tickets.rules.js:3 — the API guarantees a number
// for every one of them, so this is the order to read them in rather than a
// set to check against.
export const STATUSES = ['new', 'open', 'pending', 'resolved', 'closed', 'reopened'] as const;
export type TicketStatus = (typeof STATUSES)[number];

// An object, not a list. Every status is present with a number, zero included:
// a query grouped over tickets can only return the statuses that have some,
// and the one an admin is looking for is usually the one at zero.
export type QueueByStatus = {
  counts: Record<TicketStatus, number>;
  total: number;
};

// `enabled` because a screen that knows it may not read should not ask. A
// non-admin arriving here is shown a sentence, and firing a request that will
// be refused would put a 403 in the log for somebody who did nothing wrong
// (L-63). Hooks cannot be called conditionally, so the condition is inside.
export function useQueueByStatus({ enabled = true }: { enabled?: boolean } = {}) {
  const { status, data, error, run } = useRequest<QueueByStatus>();

  const read = useCallback(() => {
    if (!enabled) return;
    run(() => request<QueueByStatus>('/reports/queue-by-status')).catch(() => {});
  }, [run, enabled]);

  useEffect(read, [read]);

  return { status, error, report: data, reload: read };
}
