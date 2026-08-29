import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export const STATUSES = ['new', 'open', 'pending', 'resolved', 'closed', 'reopened'] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

// The API's word for "nobody has this one". Not an empty string and not a
// missing parameter — both of those mean "do not filter by assignee at all".
export const UNASSIGNED = 'none';

export const PAGE_SIZE = 25;

export type Ticket = {
  id: string;
  subject: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  categoryId: string | null;
  // BR-5's token. A write sends back the revision it read, and a mismatch is
  // refused rather than allowed to overwrite somebody else's change — so a
  // screen that means to write has to carry it.
  revision: number;
  // The moves that are legal from where this ticket is, sent with the ticket
  // and derived server-side from the same table a refusal reads. The screen
  // offers these and no others, which is what keeps the 409 a backstop rather
  // than the interface — and keeps one product rule in one place.
  allowedTransitions: string[];
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketPage = { items: Ticket[]; total: number; limit: number; offset: number };

// The four the screen offers. Kept as a list so the reader, the writer and the
// clear-all all agree on what a filter is.
const KEYS = ['status', 'priority', 'categoryId', 'assigneeId'] as const;
export type FilterKey = (typeof KEYS)[number];
export type Filters = Partial<Record<FilterKey, string>>;

export function useTicketQueue() {
  const [params, setParams] = useSearchParams();
  const { status, data, error, run } = useRequest<TicketPage>();

  // The URL is the state. Not a copy of it kept in useState — that is what
  // makes a filtered queue a link an agent can send, and what makes it survive
  // a reload and the back button without any code that restores anything.
  const filters = useMemo<Filters>(() => {
    const chosen: Filters = {};
    for (const key of KEYS) {
      const value = params.get(key);
      if (value) chosen[key] = value;
    }
    return chosen;
  }, [params]);

  const offset = Number(params.get('offset') ?? 0) || 0;

  useEffect(() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) query.set(key, value);
    query.set('limit', String(PAGE_SIZE));
    query.set('offset', String(offset));
    run(() => request<TicketPage>(`/tickets?${query}`)).catch(() => {});
  }, [filters, offset, run]);

  const apply = useCallback(
    (next: Filters) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
      // A new filter starts at the first page. Keeping the offset would show
      // page three of a result that may only have one.
      setParams(query);
    },
    [setParams],
  );

  const clear = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  const goTo = useCallback(
    (next: number) => {
      const query = new URLSearchParams(params);
      query.set('offset', String(next));
      setParams(query);
    },
    [params, setParams],
  );

  return { status, error, page: data, filters, offset, apply, clear, goTo };
}
