import { useState } from 'react';

import { Button, ErrorState, Field, Stack, TextArea } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useReply } from './useReply';
import type { Message } from './useReply';
import type { Ticket } from './useTicketQueue';

// The desk's reply, where the ticket is inspected: under the same disclosure
// that holds the history. There is no ticket detail screen, and opening one for
// this would be a second place a ticket is read.
export function ReplyBox({
  ticketId,
  onReplied,
}: {
  ticketId: string;
  onReplied: (result: { message: Message; ticket: Ticket }) => void;
}) {
  const { t } = useTranslation();
  const reply = useReply(ticketId);
  const [draft, setDraft] = useState('');
  const [blank, setBlank] = useState(false);

  const busy = reply.status === 'loading';
  const failed = reply.status === 'error' ? reply.error : null;

  return (
    <Stack gap={2}>
      <Field
        id={`reply-${ticketId}`}
        label={t.ticketReply.label}
        error={
          blank
            ? t.ticketReply.required
            : failed?.fields?.includes('body')
              ? t.errors.VALIDATION_FAILED
              : undefined
        }
      >
        {({ id, describedBy, invalid }) => (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            placeholder={t.ticketReply.placeholder}
            value={draft}
            onChange={(event) => {
              setBlank(false);
              setDraft(event.target.value);
            }}
          />
        )}
      </Field>

      <Button
        disabled={busy}
        onClick={() => {
          const trimmed = draft.trim();
          // Refused here as well as by the API. The round trip would come back
          // with the answer the screen already had, and the agent would have
          // waited for it.
          if (trimmed === '') {
            setBlank(true);
            return;
          }
          reply.submit(trimmed, (result) => {
            // Cleared only on success. Losing what somebody typed because the
            // server failed is a second failure on top of the first.
            setDraft('');
            onReplied(result);
          });
        }}
      >
        {busy ? t.ticketReply.sending : t.ticketReply.send}
      </Button>

      {failed && !failed.fields?.length ? (
        <ErrorState
          title={t.ticketReply.failed}
          body={t.errors[failed.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}
    </Stack>
  );
}
