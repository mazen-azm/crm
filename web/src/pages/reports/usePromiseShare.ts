import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import { periodQuery } from './report-period';
import type { Period } from './report-period';
import type { ReportWindow } from './period-sentence';

// Spelled the way the column spells them (sla_clocks.kind), because that is
// what the API sends. Two promises to the same person, and never one number
// averaging them.
export const KINDS = ['first_response', 'resolution'] as const;
export type ClockKind = (typeof KINDS)[number];

export type KindShare = {
  met: number;
  breached: number;
  // The promises that have FINISHED — met plus breached. Not a count of every
  // ticket: one whose deadline has not passed has neither kept its promise nor
  // broken it, and it is on neither side of the fraction.
  settled: number;
  // The unrounded ratio, or null when nothing settled. Null is not zero: a
  // period in which nothing finished is not a desk that missed everything.
  share: number | null;
};

export type PromiseShare = {
  kinds: Record<ClockKind, KindShare>;
  // Null for the all-time answer, the window used otherwise.
  window: ReportWindow;
};

// `enabled` because a screen that knows it may not read should not ask (L-63).
export function usePromiseShare(
  { enabled = true, timeZone, period }:
  { enabled?: boolean; timeZone: string; period: Period },
) {
  const { status, data, error, run } = useRequest<PromiseShare>();

  const read = useCallback(() => {
    if (!enabled) return;
    run(() => request<PromiseShare>(
      `/reports/promise-share${periodQuery(period, timeZone)}`,
    )).catch(() => {});
  }, [run, enabled, timeZone, periodQuery(period, timeZone)]);

  useEffect(read, [read]);

  return { status, error, report: data, reload: read };
}
