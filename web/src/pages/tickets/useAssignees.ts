import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type Assignee = { id: string; name: string; role: string };

type Page = { items: Assignee[]; total: number; limit: number; offset: number };

// The API's ceiling, which is refused rather than clamped (BR-4).
const PAGE = 100;

// Every page. Same reasoning as the categories: a desk with more than a
// hundred agents is not this product's problem today, and a screen that
// silently offers the first page of staff is a screen that cannot hand a
// ticket to half the team once it is.
async function readAll(): Promise<Assignee[]> {
  const items: Assignee[] = [];
  let offset = 0;
  for (;;) {
    const page = await request<Page>(`/assignees?limit=${PAGE}&offset=${offset}`);
    items.push(...page.items);
    offset += page.items.length;
    if (items.length >= page.total || page.items.length === 0) return items;
  }
}

export function useAssignees() {
  const { status, data, error, run } = useRequest<Assignee[]>();

  const reload = useCallback(() => {
    run(readAll).catch(() => {});
  }, [run]);

  useEffect(reload, [reload]);

  const assignees = data ?? [];

  // The queue answers with an assignee id and no name, because the API returns
  // ids and the screen that needs names is the screen that has the list. A id
  // that does not resolve — a page not loaded, or somebody who has since left
  // — falls back to the id: a row showing something unhelpful beats a row
  // showing nothing.
  const nameFor = useCallback(
    (id: string | null) => (id === null ? null : (assignees.find((a) => a.id === id)?.name ?? id)),
    [assignees],
  );

  return { status, error, assignees, nameFor, reload };
}
