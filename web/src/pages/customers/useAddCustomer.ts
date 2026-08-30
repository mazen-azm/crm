import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type AddCustomerInput = {
  name: string;
  // Both optional, and both ABSENT rather than '' when the field is blank.
  // The API's own rule is that a customer needs a name and nothing else —
  // somebody who telephones may have no address and no number worth keeping —
  // and it collapses a blank to null on the way in. Sending '' would be asking
  // it to store an email address that is the empty string; the fact that it
  // happens to clean up after us is not a reason to send it.
  //
  // The same distinction the ticket form draws between "no category" and an
  // empty string, for the same reason.
  email?: string;
  phone?: string;
};

// What POST /customers answers with. No `address`: the column exists but the
// API deliberately neither writes nor returns it
// (api/src/features/customers/customers.repository.js:102), so a field for it
// here would be one nothing on either side can read back.
export type CreatedCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useAddCustomer() {
  const { status, data, error, run, reset } = useRequest<CreatedCustomer>();

  const submit = useCallback(
    (input: AddCustomerInput) => {
      // Not decorative: the disabled button is the first guard and this is the
      // second, for a caller who presses Enter twice before React has
      // repainted. This POST creates a row, so a second press is a second
      // customer rather than a retry.
      if (status === 'loading') return;
      run(() =>
        request<CreatedCustomer>('/customers', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ).catch(() => {});
    },
    [run, status],
  );

  return { status, error, customer: data, submit, reset };
}
