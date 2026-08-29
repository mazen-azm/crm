import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type TicketCategory = { id: string; name: string };

type Page = { items: TicketCategory[]; total: number; limit: number; offset: number };

// The API's ceiling. Asking for more is refused rather than clamped (BR-4), so
// this is a number the client has to know rather than discover.
const PAGE = 100;

// Every page, not just the first. Six categories fit in one today — and a
// screen that quietly offers the first page of a list that later grows is the
// kind of thing that is correct right up until it is not.
async function readAll(): Promise<TicketCategory[]> {
  const items: TicketCategory[] = [];
  let offset = 0;
  for (;;) {
    const page = await request<Page>(`/ticket-categories?limit=${PAGE}&offset=${offset}`);
    items.push(...page.items);
    offset += page.items.length;
    // page.items.length === 0 guards the case where total is wrong; without it
    // a disagreement between count and page would spin forever.
    if (items.length >= page.total || page.items.length === 0) return items;
  }
}

export function useTicketCategories() {
  const { status, data, error, run } = useRequest<TicketCategory[]>();

  // The categories the form offers. Retired ones are already absent — the list
  // route excludes them and a test pins it, so filtering again here would put
  // one product rule in two places.
  const reload = useCallback(() => {
    run(readAll).catch(() => {});
  }, [run]);

  useEffect(reload, [reload]);

  return { status, error, categories: data ?? [], reload };
}
