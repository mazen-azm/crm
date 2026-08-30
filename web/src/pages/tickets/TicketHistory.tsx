import { useState } from 'react';

import { Button, EmptyState, ErrorState, Heading, Skeleton, Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { historySentence } from './history-sentence';
import { useTicketHistory } from './useTicketHistory';
import './TicketHistory.css';
import type { useAssignees } from './useAssignees';

// Behind a disclosure, and fetched only when it is opened. The queue shows
// twenty-five tickets at a time; a history mounted open on every row would be
// twenty-five requests for a trail nobody asked to read.
export function TicketHistory({
  ticketId,
  assignees,
}: {
  ticketId: string;
  // Handed in rather than fetched here: the row already holds the staff list
  // for its assignee picker, and a component per row loading it again would be
  // the same list twenty-five times.
  assignees: ReturnType<typeof useAssignees>;
}) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const history = useTicketHistory(ticketId);
  const [open, setOpen] = useState(false);

  const nameOf = (id: string | null) => assignees.nameFor(id) ?? t.ticketHistory.systemActor;
  const busy = history.status === 'loading';

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
          history.load();
        }}
      >
        {t.ticketHistory.show}
      </Button>
    );
  }

  return (
    <Stack gap={3}>
      <Heading level={2}>{t.ticketHistory.heading}</Heading>

      {busy && history.entries.length === 0 ? (
        <Skeleton lines={3} height="24px" label={t.ticketHistory.loading} />
      ) : null}

      {history.status === 'error' && history.error ? (
        <ErrorState
          title={t.ticketHistory.errorTitle}
          body={t.errors[history.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={history.load}
          retryLabel={t.states.retry}
        />
      ) : null}

      {history.status === 'success' && history.entries.length === 0 ? (
        <EmptyState title={t.ticketHistory.emptyTitle} body={t.ticketHistory.emptyBody} />
      ) : null}

      {history.entries.length > 0 ? (
        // An ordered list, in the order the API gave them: oldest first, and
        // ties broken by the row id rather than the timestamp, because two
        // changes in the same second share a stamp. Nothing is sorted here —
        // a second sort on the client is a second answer to what "in order"
        // means.
        <ol className="ticket-history">
          {history.entries.map((entry) => (
            <li className="ticket-history__entry" key={entry.id}>
              <Text>{historySentence(entry, { t, nameOf })}</Text>
              {/* Never the raw stamp. The trail is read by whoever is on the
                  phone, in their own locale (BR-3). */}
              <Text variant="muted">
                {formatDate(entry.at, { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </li>
          ))}
        </ol>
      ) : null}

      {history.more ? (
        <Button variant="secondary" disabled={busy} onClick={history.loadMore}>
          {busy ? t.ticketHistory.loading : t.ticketHistory.loadMore}
        </Button>
      ) : null}

      <Button variant="secondary" onClick={() => setOpen(false)}>
        {t.ticketHistory.hide}
      </Button>
    </Stack>
  );
}
