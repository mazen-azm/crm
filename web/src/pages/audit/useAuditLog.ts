import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { HistoryEntry } from '../tickets/useTicketHistory';

// A trail row carries what the ticket history's does, plus which thing it was
// about — the audit screen reads every entity, so it has to say.
export type TrailEntry = HistoryEntry & { entity: string; entityId: string };

export type TrailPage = { items: TrailEntry[]; total: number; limit: number; offset: number };

// The filters this screen understands, and the only ones it sends. A parameter
// the API does not know is not passed through: the address bar is a place
// people edit, and forwarding whatever is in it would make a typo a 422 the
// reader cannot connect to anything they did.
const FILTERS = ['actorId', 'entity', 'entityId', 'from', 'to'] as const;
type Filter = (typeof FILTERS)[number];

// `enabled` because a screen that knows it may not read should not ask. A
// non-admin arriving here is shown a sentence, and firing a request that will
// be refused would put a 403 in the log for something nobody did wrong — and
// hooks cannot be called conditionally, so the condition belongs inside.
export function useAuditLog({ enabled = true }: { enabled?: boolean } = {}) {
  const [params, setParams] = useSearchParams();
  const { status, data, error, run } = useRequest<TrailPage>();

  // The address is the state, not a copy of it. A view somebody can send to a
  // colleague and the back button returns to — the queue decided this first
  // and this follows it.
  const filters = Object.fromEntries(
    FILTERS.filter((name) => params.get(name)).map((name) => [name, params.get(name) as string]),
  ) as Partial<Record<Filter, string>>;
  const offset = Number(params.get('offset') ?? 0);

  const query = new URLSearchParams(filters);
  if (offset > 0) query.set('offset', String(offset));

  const read = useCallback(() => {
    if (!enabled) return;
    const search = query.toString();
    run(() => request<TrailPage>(`/audit-events${search ? `?${search}` : ''}`)).catch(() => {});
    // The query string, not the object: a new object every render would re-run
    // this on every render.
  }, [run, enabled, query.toString()]);

  useEffect(read, [read]);

  const set = (next: Partial<Record<Filter | 'offset', string | null>>) => {
    const updated = new URLSearchParams(params);
    for (const [name, value] of Object.entries(next)) {
      if (value === null || value === '') updated.delete(name);
      else updated.set(name, value);
    }
    // Any change to a filter starts again from the first page. Keeping the
    // offset would show page four of a search that may have three.
    if (!('offset' in next)) updated.delete('offset');
    setParams(updated, { replace: true });
  };

  const page = data;
  return {
    status,
    error,
    page,
    filters,
    offset,
    limit: page?.limit ?? 0,
    entries: page?.items ?? [],
    hasMore: page !== null && offset + page.items.length < page.total,
    set,
    reload: read,
  };
}
