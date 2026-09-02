import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Account } from './useAccounts';

// One hook per action, each with its own request state — the same reasoning
// useManageCategories gives: a create failing belongs under the create form
// and a disable failing belongs on the row it was pressed on, and one shared
// state would put the message in both places or in neither.

// What creating answers with. `initialPassword` is the only time it exists:
// the API mints it, hands it back once, and stores nothing but its hash. It is
// deliberately absent from the audit row (identity.service.js:99-101), and it
// must be absent from everywhere else this client could put it.
export type CreatedAccount = { user: Account; initialPassword: string };

export function useCreateAccount() {
  const { status, data, error, run, reset } = useRequest<CreatedAccount>();
  const create = useCallback(
    (fields: { email: string; name: string; role: string }) =>
      run(() =>
        request<CreatedAccount>('/accounts', {
          method: 'POST',
          body: JSON.stringify(fields),
        }),
      ),
    [run],
  );
  // `created` is held in React state and nowhere else. No storage, no URL, no
  // history entry, no console — a password written anywhere it can be read
  // again is a password that outlives the moment it was handed over.
  return { status, error, created: data, create, reset };
}

// The count beside the user, not instead of it. The API returns how many
// tickets the disable handed back, because an admin deciding whether to
// disable somebody is deciding what happens to their work — and zero is an
// answer, not an omission.
export type DisabledAccount = { user: Account; unassigned: number };

export function useDisableAccount() {
  const { status, data, error, run, reset } = useRequest<DisabledAccount>();
  const disable = useCallback(
    (id: string) => run(() => request<DisabledAccount>(`/accounts/${id}/disable`, { method: 'POST' })),
    [run],
  );
  return { status, error, disabled: data, disable, reset };
}

export function useReEnableAccount() {
  const { status, error, run, reset } = useRequest<{ user: Account }>();
  const reEnable = useCallback(
    (id: string) => run(() => request<{ user: Account }>(`/accounts/${id}/re-enable`, { method: 'POST' })),
    [run],
  );
  return { status, error, reEnable, reset };
}
