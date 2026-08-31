import { useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Heading,
  Skeleton,
  Stack,
  Text,
  TextArea,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { priorityLabel, statusLabel } from '../tickets/ticket-labels';
import { pagerSentence } from '../tickets/pager-sentence';
import { useTicketThread } from '../tickets/useTicketThread';
import { useReply } from '../tickets/useReply';
import { useMe } from '../../shared/session/use-me';
import { useCustomerTicket } from './useCustomerTicket';
import './PortalTicketPage.css';
import type { Message } from '../tickets/useReply';

const SEPARATOR = ' · ';

// A customer reads one of their own tickets.
//
// It shares the desk's thread HOOK and none of its chrome. The paging is the
// same question asked of the same route, so a second hook would be a second
// answer to it — but the desk's component captions every message with its kind
// and asks for the staff list to name authors, and a customer may read neither.
//
// It filters nothing. A customer is never sent an internal note: the API
// decides that and a census drives every route to prove it (SC-2). A screen
// that hid what it had been given would mean the API had sent it.
export function PortalTicketPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { id = '' } = useParams();
  const { status, error, ticket, load } = useCustomerTicket(id);
  const thread = useTicketThread(id);
  const reply = useReply(id);
  const { me } = useMe();

  const [draft, setDraft] = useState('');
  const [blank, setBlank] = useState(false);
  const [posted, setPosted] = useState<Message[]>([]);
  const [opened, setOpened] = useState(false);

  // The thread is read once the ticket is, and not before: a ticket that is
  // not theirs answers 404 and there is nothing to read.
  if (status === 'success' && !opened) {
    setOpened(true);
    thread.load();
  }

  if (status === 'loading' || status === 'idle') {
    return <Skeleton lines={4} height="48px" label={t.states.loading} />;
  }

  if (status === 'error' && error) {
    // Somebody else's ticket and a ticket that does not exist are one answer
    // here because they are one answer from the API — and the screen must not
    // be the place the two become distinguishable again.
    return error.code === 'NOT_FOUND' ? (
      <EmptyState title={t.portalTicket.notFoundTitle} body={t.portalTicket.notFoundBody} />
    ) : (
      <ErrorState
        title={t.portalTicket.errorTitle}
        body={t.errors[error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        onRetry={load}
        retryLabel={t.states.retry}
      />
    );
  }

  if (!ticket) return null;

  const shown = thread.atNewest
    ? [...thread.messages, ...posted.filter((one) => !thread.messages.some((held) => held.id === one.id))]
    : thread.messages;
  const busy = reply.status === 'loading';
  const failed = reply.status === 'error' ? reply.error : null;

  return (
    <Stack as="section" gap={4}>
      <Stack gap={1}>
        <Heading level={2}>{ticket.subject}</Heading>
        <Text variant="muted">
          {[statusLabel(t, ticket.status), priorityLabel(t, ticket.priority), formatDate(ticket.createdAt)].join(
            SEPARATOR,
          )}
        </Text>
      </Stack>

      {thread.status === 'loading' && shown.length === 0 ? (
        <Skeleton lines={3} height="32px" label={t.portalTicket.loadingThread} />
      ) : null}

      {thread.status === 'error' && thread.error ? (
        <ErrorState
          title={t.portalTicket.threadErrorTitle}
          body={t.errors[thread.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={thread.load}
          retryLabel={t.states.retry}
        />
      ) : null}

      {thread.status === 'success' && shown.length === 0 ? (
        <EmptyState title={t.portalTicket.emptyTitle} body={t.portalTicket.emptyBody} />
      ) : null}

      {shown.length > 0 ? (
        <ol className="portal-thread">
          {shown.map((message) => {
            // Whose it is: the reader's own id against the message's author.
            // Not the ticket's customerId — that is a CUSTOMER id and the
            // author is a USER id, two different rows joined by
            // customers.user_id, and comparing them would make every message
            // somebody else's.
            //
            // No badge either. A word like "Agent" beside a reply reads as a
            // status the reader has been given, which is not what it means.
            const mine = me !== null && message.authorId === me.id;
            return (
              <li
                className={['portal-thread__message', mine && 'portal-thread__message--mine']
                  .filter(Boolean)
                  .join(' ')}
                key={message.id}
              >
                <span className="portal-thread__who">
                  {mine ? t.portalTicket.fromYou : t.portalTicket.fromSupport}
                </span>
                <Text>{message.body}</Text>
                <Text variant="muted">
                  {formatDate(message.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              </li>
            );
          })}
        </ol>
      ) : null}

      {thread.page && thread.page.total > thread.page.limit ? (
        <Stack gap={2}>
          <Text variant="muted">{pagerSentence(thread.page, { t, atNewest: thread.atNewest })}</Text>
          <Stack direction="row" gap={2} align="start">
            <Button variant="secondary" disabled={thread.atOldest} onClick={thread.previous}>
              {t.ticketThread.older}
            </Button>
            <Button variant="secondary" disabled={thread.atNewest} onClick={thread.next}>
              {t.ticketThread.newer}
            </Button>
          </Stack>
        </Stack>
      ) : null}

      <Card>
        <Stack gap={2}>
          {/* Before the box, not after it and not on the button. Somebody who
              learns that their reply reopened the ticket only once it has
              reads a status they did not ask for as a fault. Whether it is
              still true is the API's answer (T-5's fourteen days), not a sum
              this screen does. */}
          {ticket.reopenWindowOpen ? <Text>{t.portalTicket.replyReopens}</Text> : null}

          <Field
            id="portal-reply"
            label={t.portalTicket.replyLabel}
            error={
              blank
                ? t.portalTicket.replyRequired
                : failed?.fields?.includes('body')
                  ? t.errors.VALIDATION_FAILED
                  : undefined
            }
          >
            {({ id: fieldId, describedBy, invalid }) => (
              <TextArea
                id={fieldId}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder={t.portalTicket.replyPlaceholder}
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
              if (trimmed === '') {
                setBlank(true);
                return;
              }
              // 'public' is the only kind a customer may write and the API
              // forces it whatever is sent. Named rather than omitted, so the
              // request says what it means.
              reply.submit({ body: trimmed, kind: 'public' }, ({ message }) => {
                setDraft('');
                setPosted((held) => [...held, message]);
                // The ticket, not just the thread: a reply inside the window
                // reopens it, and a screen still saying Resolved afterwards is
                // the screen disagreeing with the ticket it just changed.
                load();
              });
            }}
          >
            {busy ? t.portalTicket.sending : t.portalTicket.send}
          </Button>

          {failed && !failed.fields?.length ? (
            <ErrorState
              title={t.portalTicket.replyFailedTitle}
              // The shared sentence for a code is a default, not a law, and
              // this is the case that shows why. A customer replying to a
              // CLOSED ticket gets ILLEGAL_TRANSITION, whose shared sentence
              // is "that is not a move this ticket can make from where it is"
              // — true of the desk's status control, and nonsense to somebody
              // who did not try to move anything. They wrote a message.
              //
              // REOPEN_WINDOW_CLOSED keeps its shared sentence, which was
              // written for a customer and already says what to do instead.
              // Overriding a sentence that is right would be two places for
              // one string.
              body={
                failed.code === 'ILLEGAL_TRANSITION'
                  ? t.portalTicket.replyClosedTicket
                  : (t.errors[failed.code as keyof typeof t.errors] ?? t.errors.INTERNAL)
              }
            />
          ) : null}
        </Stack>
      </Card>
    </Stack>
  );
}
