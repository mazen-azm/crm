import { useState } from 'react';

import { Button, ErrorState, Field, Stack, TextArea } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useReply } from './useReply';
import type { Message, MessageKind } from './useReply';
import type { Ticket } from './useTicketQueue';
import './TicketThread.css';

// The desk's reply, where the ticket is inspected: under the same disclosure
// that holds the history. There is no ticket detail screen, and opening one for
// this would be a second place a ticket is read.
//
// It writes either kind, and which one is settled BEFORE anything is typed.
// The choice is two radios rather than a menu because both options have to be
// readable without opening anything: somebody about to write a sentence they
// would not say to a customer needs to know which box they are in first, and a
// closed menu showing the current mode answers that only if they look. The box
// changes with it — label, placeholder, button, and the surface itself — so
// the mode is legible from four places at once rather than one caption.
//
// Every reader of this component is on the desk. A customer's kind is not
// theirs to choose and the API forces it public whatever is sent (SC-2); this
// screen is not what keeps them out of a note.
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
  const [kind, setKind] = useState<MessageKind>('public');
  const internal = kind === 'internal';

  const busy = reply.status === 'loading';
  const failed = reply.status === 'error' ? reply.error : null;

  const modes: Array<{ value: MessageKind; label: string }> = [
    { value: 'public', label: t.ticketReply.modePublic },
    { value: 'internal', label: t.ticketReply.modeInternal },
  ];

  return (
    <Stack gap={2}>
      <div className={internal ? 'ticket-reply--internal' : undefined}>
        <Stack gap={2}>
          <fieldset className="ticket-reply__modes">
            <legend>{t.ticketReply.mode}</legend>
            {modes.map((one) => (
              <label className="ticket-reply__mode" key={one.value}>
                <input
                  type="radio"
                  name={`reply-kind-${ticketId}`}
                  value={one.value}
                  checked={kind === one.value}
                  onChange={() => setKind(one.value)}
                />
                {one.label}
              </label>
            ))}
          </fieldset>

      <Field
        id={`reply-${ticketId}`}
        label={internal ? t.ticketReply.noteLabel : t.ticketReply.label}
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
            placeholder={internal ? t.ticketReply.notePlaceholder : t.ticketReply.placeholder}
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
          reply.submit({ body: trimmed, kind }, (result) => {
            // Cleared only on success. Losing what somebody typed because the
            // server failed is a second failure on top of the first.
            setDraft('');
            onReplied(result);
          });
        }}
      >
        {busy
          ? internal
            ? t.ticketReply.savingNote
            : t.ticketReply.sending
          : internal
            ? t.ticketReply.sendNote
            : t.ticketReply.send}
      </Button>
        </Stack>
      </div>

      {failed && !failed.fields?.length ? (
        <ErrorState
          title={t.ticketReply.failed}
          body={t.errors[failed.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}
    </Stack>
  );
}
