import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

// The three answers `GET /accounts?state=` gives. Mirrors ACCOUNT_STATES in
// api/src/features/identity/identity.rules.js — the API refuses a fourth, and
// this union is what stops the screen sending one.
export const ACCOUNT_STATES = ['live', 'disabled', 'all'] as const;
export type AccountState = (typeof ACCOUNT_STATES)[number];

export type Account = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string | null;
  updatedAt: string | null;
  // Null while the account is live, the moment it was disabled otherwise. The
  // API had to be taught to select the column to answer this honestly; before
  // that every row said null whether it was true or not.
  deletedAt: string | null;
};

export type AccountsPage = {
  items: Account[];
  total: number;
  limit: number;
  offset: number;
  state: AccountState;
};

const isState = (value: string | null): value is AccountState =>
  value !== null && (ACCOUNT_STATES as readonly string[]).includes(value);

// `enabled` because a screen that knows it may not read should not ask. A
// non-admin arriving here is shown a sentence, and firing a request that will
// be refused would put a 403 in the audit log for somebody who did nothing
// wrong (L-63). Hooks cannot be called conditionally, so the condition is
// inside.
export function useAccounts({ enabled = true }: { enabled?: boolean } = {}) {
  const [params, setParams] = useSearchParams();
  const { status, data, error, run } = useRequest<AccountsPage>();

  // The address is the state, not a copy of it — a view somebody can send to a
  // colleague and the back button returns to. The queue decided this first and
  // the audit log followed it.
  const raw = params.get('state');
  const state: AccountState = isState(raw) ? raw : 'live';
  const offset = Number(params.get('offset') ?? 0);

  const query = new URLSearchParams();
  // Only when it is not the default: an address that says `?state=live` and
  // one that says nothing are the same view, and only one of them should exist.
  if (state !== 'live') query.set('state', state);
  if (offset > 0) query.set('offset', String(offset));

  const read = useCallback(() => {
    if (!enabled) return;
    const search = query.toString();
    run(() => request<AccountsPage>(`/accounts${search ? `?${search}` : ''}`)).catch(() => {});
    // The query string, not the object: a new object every render would re-run
    // this on every render.
  }, [run, enabled, query.toString()]);

  useEffect(read, [read]);

  const set = (next: { state?: AccountState; offset?: string | null }) => {
    const updated = new URLSearchParams(params);
    if (next.state !== undefined) {
      if (next.state === 'live') updated.delete('state');
      else updated.set('state', next.state);
    }
    if (next.offset === null || next.offset === '') updated.delete('offset');
    else if (next.offset !== undefined) updated.set('offset', next.offset);
    // Changing which accounts we are looking at starts again from the first
    // page. Keeping the offset would show page four of a list with three.
    if (next.state !== undefined) updated.delete('offset');
    setParams(updated, { replace: true });
  };

  const page = data;
  return {
    status,
    error,
    page,
    state,
    offset,
    limit: page?.limit ?? 0,
    accounts: page?.items ?? [],
    hasMore: page !== null && offset + page.items.length < page.total,
    set,
    reload: read,
  };
}
