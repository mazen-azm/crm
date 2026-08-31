import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Skeleton,
  Stack,
  Text,
} from '../../shared/ui';
import { Link } from 'react-router-dom';

import { useTranslation, useFormatters } from '../../shared/i18n';
import { priorityLabel, statusLabel } from '../tickets/ticket-labels';
import { PAGE_SIZE, useMyTickets } from './useMyTickets';

// One separator, in one place — punctuation rather than words, so it does not
// belong in the resource files, and not inline either. The queue's comment
// says the same about its own.
const SEPARATOR = ' · ';

export function MyTicketsPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const mine = useMyTickets();
  const page = mine.page;

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.myTickets.title}</Heading>

      {mine.status === 'loading' ? (
        // Shaped like the rows it becomes, so the page does not jump when the
        // answer lands under somebody's cursor.
        <Skeleton lines={3} height="64px" label={t.states.loading} />
      ) : null}

      {mine.status === 'error' && mine.error ? (
        <ErrorState
          title={t.myTickets.errorTitle}
          body={t.errors[mine.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={() => mine.read(0)}
          retryLabel={t.states.retry}
        />
      ) : null}

      {mine.status === 'success' && page && page.items.length === 0 ? (
        <EmptyState
          title={t.myTickets.emptyTitle}
          body={t.myTickets.emptyBody}
          // A real next action, because that screen exists and takes no
          // account (D-2 asks for one rather than a sentence alone).
          action={
            <Link to="/raise">
              <Button variant="secondary">{t.myTickets.raiseOne}</Button>
            </Link>
          }
        />
      ) : null}

      {page && page.items.length > 0 ? (
        <Stack gap={3}>
          {page.items.map((ticket) => (
            <Card key={ticket.id}>
              <Stack gap={1}>
                {/* The row is the way in. A screen nobody can reach from
                    the screen before it is a screen that does not exist —
                    and the subject is what somebody is looking for, so it is
                    what they click. */}
                <Link to={`/portal/tickets/${ticket.id}`}>{ticket.subject}</Link>
                {/* The same words the desk reads, from the same module. Two
                    copies of a mapping disagree the first time one changes,
                    and neither screen looks wrong on its own. */}
                <Text variant="muted">
                  {[
                    statusLabel(t, ticket.status),
                    priorityLabel(t, ticket.priority),
                    formatDate(ticket.createdAt),
                  ].join(SEPARATOR)}
                </Text>
              </Stack>
            </Card>
          ))}

          {/* The API's window, not the screen's: it says what it gave and from
              where, and this only asks for the next one (BR-4). */}
          <Stack direction="row" gap={2} align="start">
            <Button
              variant="secondary"
              disabled={page.offset === 0}
              onClick={() => mine.read(Math.max(0, page.offset - PAGE_SIZE))}
            >
              {t.myTickets.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page.offset + page.items.length >= page.total}
              onClick={() => mine.read(page.offset + PAGE_SIZE)}
            >
              {t.myTickets.next}
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
