import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Isolated,
  Skeleton,
  Stack,
  Text,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { priorityLabel, statusLabel } from '../tickets/ticket-labels';
import { useCustomer } from './useCustomer';

// The separator is punctuation, not words, so it does not belong in the
// resource files — but it does not belong typed between tags either, where
// no-hardcoded-strings catches it and is right to.
const SEPARATOR = ' · ';

export function CustomerScreenPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { id = '' } = useParams();
  const { status, error, screen, reload } = useCustomer(id);

  if (status === 'loading' || status === 'idle') {
    return <Skeleton lines={6} height="64px" label={t.states.loading} />;
  }

  if (status === 'error' || !screen) {
    return (
      <ErrorState
        title={t.customerScreen.errorTitle}
        body={t.errors[error?.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        onRetry={reload}
        retryLabel={t.states.retry}
      />
    );
  }

  const { customer, tickets, notes } = screen;

  return (
    <Stack gap={4}>
      <Heading level={1}>{customer.name}</Heading>

      <Card>
        <Stack gap={1}>
          <Text variant="muted">{t.customerScreen.contacts}</Text>
          {/* Both are left-to-right runs that a right-to-left paragraph would
              otherwise reorder — a phone number's groups reverse and its plus
              lands at the far end. */}
          <Text>
            <Isolated>{customer.email ?? t.customerScreen.noEmail}</Isolated>
          </Text>
          <Text>
            <Isolated>{customer.phone ?? t.customerScreen.noPhone}</Isolated>
          </Text>
        </Stack>
      </Card>

      <Heading level={2}>{t.customerScreen.openTickets}</Heading>
      {tickets.items.length === 0 ? (
        <EmptyState
          title={t.customerScreen.noOpenTickets}
          body={t.customerScreen.noOpenTicketsBody}
          action={
            // A real next action, because that screen exists. D-2 asks for one
            // rather than for a sentence alone.
            <Link to="/tickets/new">
              <Button variant="secondary">{t.customerScreen.raiseOne}</Button>
            </Link>
          }
        />
      ) : (
        <Stack gap={3}>
          {tickets.items.map((ticket) => (
            <Card key={ticket.id}>
              <Stack gap={1}>
                <Text>{ticket.subject}</Text>
                {/* Words from the resource files, not the API's raw values —
                    and the same words the queue uses, from one module. */}
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
        </Stack>
      )}

      <Heading level={2}>{t.customerScreen.notes}</Heading>
      {notes.items.length === 0 ? (
        <Text variant="muted">{t.customerScreen.noNotes}</Text>
      ) : (
        <Stack gap={3}>
          {notes.items.map((note) => (
            <Card key={note.id}>
              <Stack gap={1}>
                <Text>{note.body}</Text>
                <Text variant="muted">{formatDate(note.createdAt)}</Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
