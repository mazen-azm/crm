import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Customer } from './useCustomer';

// A contact correction. The patch is what somebody edited, not the whole form:
// the API leaves absent fields alone, which is what keeps the audit diff
// readable and what stops a screen from overwriting two fields to change one.
//
// No revision. BR-5 names the writes it covers and this is not one of them;
// sending one would be inventing a rule the server does not have.
export type ContactPatch = Partial<Pick<Customer, 'name'>> & {
  email?: string | null;
  phone?: string | null;
};

export function useCorrectContacts(id: string) {
  const { status, error, run, reset } = useRequest<Customer>();

  const correct = useCallback(
    (patch: ContactPatch) =>
      run(() =>
        request<Customer>(`/customers/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),
      ),
    [run, id],
  );

  return { status, error, correct, reset };
}
