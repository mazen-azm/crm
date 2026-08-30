import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';

export type PublicTicketInput = {
  email: string;
  name?: string;
  subject: string;
  body: string;
};

// What the intake answers with: a ticket, exactly as a desk-raised one reads.
// The id IS the reference — there is no second reference number, and inventing
// one would be a second way to name one thing.
export type PublicTicket = {
  id: string;
  status: string;
  subject: string;
  createdAt: string;
};

// The channel every public request comes in through. CHANNELS-2-API answers
// 501 for `email`, `whatsapp` and `sms` — named, and deliberately not built —
// so this is the one name that works, and it is written once here rather than
// spelled into a URL at the call site.
const CHANNEL = 'web';

export function usePublicRaiseTicket() {
  const { status, data, error, run, reset } = useRequest<PublicTicket>();

  const submit = useCallback(
    (input: PublicTicketInput) => {
      // This creates a ticket, so a second press is a second ticket. The
      // disabled button is the first guard; this is the one a keyboard repeat
      // meets.
      if (status === 'loading') return;
      run(() =>
        // The intake, not /tickets. /tickets is the desk's route and refuses
        // anybody who is not staff — and a screen that wrote a ticket by
        // another path would be the second write path the channel seam exists
        // to prevent (SC-2).
        request<PublicTicket>(`/intake/${CHANNEL}/tickets`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ).catch(() => {});
    },
    [run, status],
  );

  return { status, error, ticket: data, submit, reset };
}
