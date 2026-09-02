import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import { periodQuery } from './report-period';
import type { Period } from './report-period';
import type { ReportWindow } from './period-sentence';

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
  // What the API answered about: null for the snapshot, the window it used
  // otherwise. The screen's label is read from here and from nowhere else.
  window: ReportWindow;
};

// `enabled` because a screen that knows it may not read should not ask. A
// non-admin arriving here is shown a sentence, and firing a request that will
// be refused would put a 403 in the log for somebody who did nothing wrong
// (L-63). Hooks cannot be called conditionally, so the condition is inside.
export function useQueueByStatus(
  { enabled = true, timeZone, period }:
  { enabled?: boolean; timeZone: string; period: Period },
) {
  const { status, data, error, run } = useRequest<QueueByStatus>();

  const read = useCallback(() => {
    if (!enabled) return;
    run(() => request<QueueByStatus>(
      `/reports/queue-by-status${periodQuery(period, timeZone)}`,
    )).catch(() => {});
    // The query string, not the object: a fresh Period every render would
    // re-fire this on every render.
  }, [run, enabled, timeZone, periodQuery(period, timeZone)]);

  useEffect(read, [read]);

  return { status, error, report: data, reload: read };
}
