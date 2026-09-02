import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type AgentLoad = { id: string; name: string; role: string; load: number };

export type LoadReport = {
  // Already ordered by name, with the id as a tiebreak, so two people sharing
  // a name do not swap places between two reads (L-19). Not re-sorted here:
  // one place decides the order, and REPORTS-3-API says in its own scope that
  // the report counts and does not judge.
  agents: AgentLoad[];
  unassigned: number;
  // Every live ticket that is not resolved or closed, and what the rows plus
  // the unassigned figure do not reach. `unaccounted` is normally zero and
  // means a ticket is held by somebody this report does not list — today, an
  // account that was disabled without its work being handed back.
  open: number;
  unaccounted: number;
};

// `enabled` because a screen that knows it may not read should not ask (L-63).
export function useAgentLoad({ enabled = true }: { enabled?: boolean } = {}) {
  const { status, data, error, run } = useRequest<LoadReport>();

  const read = useCallback(() => {
    if (!enabled) return;
    run(() => request<LoadReport>('/reports/agent-load')).catch(() => {});
  }, [run, enabled]);

  useEffect(read, [read]);

  return { status, error, report: data, reload: read };
}
