import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type RaiseTicketInput = {
  customerId: string;
  // null is a ticket with no category, which the API allows. An empty string
  // is not — it would be a categoryId that cannot exist.
  categoryId: string | null;
  priority: Priority;
  subject: string;
  // `body` because that is what the API calls it. Renaming it on the way
  // through would mean a 422's fields: ['body'] names a field this form does
  // not have, and the wrong input gets marked.
  body: string;
};

export type RaisedTicket = {
  id: string;
  status: string;
  priority: Priority;
  categoryId: string | null;
  subject: string;
  body: string;
  createdAt: string;
};

export function useRaiseTicket() {
  const { status, data, error, run, reset } = useRequest<RaisedTicket>();

  const submit = useCallback(
    (input: RaiseTicketInput) => {
      if (status === 'loading') return;
      run(() =>
        request<RaisedTicket>('/tickets', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ).catch(() => {});
    },
    [run, status],
  );

  return { status, error, ticket: data, submit, reset };
}
