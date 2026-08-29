import { useCallback, useState } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CustomerPage = {
  items: Customer[];
  total: number;
  limit: number;
  offset: number;
};

export const PAGE_SIZE = 20;

// A thin wrapper. useRequest is the only place a screen expresses loading, and
// it already keeps a monotonic ticket so a slow first answer cannot overwrite a
// fast second one — do not add a second dedupe on top of it.
export function useCustomerSearch() {
  const { status, data, error, run } = useRequest<CustomerPage>();
  // What was actually asked for, which is not what is in the input box: the
  // paging buttons must re-run the submitted term, not whatever has been typed
  // since.
  const [query, setQuery] = useState({ term: '', offset: 0 });

  const search = useCallback(
    (term: string, offset = 0) => {
      setQuery({ term, offset });
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (term !== '') params.set('q', term);
      return run(() => request<CustomerPage>(`/customers?${params}`));
    },
    [run],
  );

  return { status, page: data, error, query, search };
}
