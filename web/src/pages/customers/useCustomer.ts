import { useCallback, useEffect } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Ticket } from '../tickets/useTicketQueue';

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  // Whether they can sign in — not which account it is. The API answers with
  // this rather than a user id on purpose: a screen needs to know that a grant
  // has happened so it can say so instead of offering an action that will be
  // refused, and whose account it is belongs to identity.
  hasSignIn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  customerId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
};

export type CustomerScreen = {
  customer: Customer;
  tickets: { items: Ticket[]; total: number; limit: number; offset: number };
  notes: { items: Note[]; total: number };
};

// One request, not three.
//
// That is an acceptance criterion rather than an optimisation: the three parts
// are read inside one transaction on the server, so they agree with each
// other. A screen that fetched them separately would show three moments and
// call it one, and no amount of care on this side would fix that.
export function useCustomer(id: string) {
  const { status, data, error, run } = useRequest<CustomerScreen>();

  const reload = useCallback(() => {
    run(() => request<CustomerScreen>(`/customers/${id}`)).catch(() => {});
  }, [run, id]);

  useEffect(reload, [reload]);

  return { status, error, screen: data, reload };
}
