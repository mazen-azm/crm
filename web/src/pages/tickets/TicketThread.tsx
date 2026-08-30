import { useState } from 'react';

import { Button, EmptyState, ErrorState, Heading, Isolated, Skeleton, Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { useTicketThread } from './useTicketThread';
import './TicketThread.css';
import type { Message } from './useReply';
import type { useAssignees } from './useAssignees';

// The desk's view of one conversation: public replies and internal notes in
// one stream, in the order the API gave them.
//
// It filters nothing. What a customer may see is the API's rule and there is a
// census that drives every route to prove it (SC-2) — a screen that hid notes
// would be a second gate, and the second gate is the one that goes stale.
//
// Behind a disclosure and fetched on opening, for the reason the history is:
// twenty-five rows that read their own thread unasked are twenty-five requests
// for something nobody opened.
export function TicketThread({
  ticketId,
  assignees,
  posted,
}: {
  ticketId: string;
  assignees: ReturnType<typeof useAssignees>;
  // Messages written from this row since it was rendered. The composer knows
  // about them before the thread does, and a reply that did not appear where
  // the agent just sent it reads as a reply that was not sent.
  posted: Message[];
}) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const thread = useTicketThread(ticketId);
  const [open, setOpen] = useState(false);

  // A thread has two sides. Everybody on the desk's side is in the staff list
  // the row already holds; an author who is not in it is the customer.
  const authorOf = (id: string) =>
    assignees.assignees.find((a) => a.id === id)?.name ?? t.ticketThread.customerAuthor;

  // Loaded plus anything written since, minus what is in both — a message
  // posted while the thread was closed arrives again when it is opened.
  const shown = [
    ...thread.messages,
    ...posted.filter((one) => !thread.messages.some((held) => held.id === one.id)),
  ];
  const busy = thread.status === 'loading';

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
          thread.load();
        }}
      >
        {t.ticketThread.show}
      </Button>
    );
  }

  return (
    <Stack gap={3}>
      <Heading level={2}>{t.ticketThread.heading}</Heading>

      {busy && shown.length === 0 ? (
        <Skeleton lines={3} height="24px" label={t.ticketThread.loading} />
      ) : null}

      {thread.status === 'error' && thread.error ? (
        <ErrorState
          title={t.ticketThread.errorTitle}
          body={t.errors[thread.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={thread.load}
          retryLabel={t.states.retry}
        />
      ) : null}

      {thread.status === 'success' && shown.length === 0 ? (
        <EmptyState title={t.ticketThread.emptyTitle} body={t.ticketThread.emptyBody} />
      ) : null}

      {shown.length > 0 ? (
        <ol className="ticket-thread">
          {shown.map((message) => {
            // Anything that is not a note is a reply the customer can read.
            // The API's vocabulary has two words and refuses a third, so this
            // is exhaustive — and if it ever were not, the safe way to be
            // wrong is to warn about a message rather than to hide that one
            // exists.
            const internal = message.kind === 'internal';
            return (
              <li
                className={['ticket-thread__message', internal && 'ticket-thread__message--internal']
                  .filter(Boolean)
                  .join(' ')}
                key={message.id}
              >
                <span
                  className={['ticket-thread__tag', internal && 'ticket-thread__tag--internal']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {internal ? t.ticketThread.internalTag : t.ticketThread.publicTag}
                </span>
                <Text>{message.body}</Text>
                {/* The name is isolated: a Latin name inside an Arabic line
                    drags the punctuation to the wrong end otherwise (L-51). */}
                <Text variant="muted">
                  <Isolated>{authorOf(message.authorId)}</Isolated>
                </Text>
                <Text variant="muted">
                  {formatDate(message.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              </li>
            );
          })}
        </ol>
      ) : null}

      {thread.more ? (
        <Button variant="secondary" disabled={busy} onClick={thread.loadMore}>
          {busy ? t.ticketThread.loading : t.ticketThread.loadMore}
        </Button>
      ) : null}

      <Button variant="secondary" onClick={() => setOpen(false)}>
        {t.ticketThread.hide}
      </Button>
    </Stack>
  );
}
