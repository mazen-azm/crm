import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Isolated,
  Field,
  Skeleton,
  Stack,
  Text,
  TextArea,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { priorityLabel, statusLabel } from '../tickets/ticket-labels';
import { useAssignees } from '../tickets/useAssignees';
import { useCustomer } from './useCustomer';
import { useGrantSignIn } from './useGrantSignIn';
import { isBlank, useWriteNote } from './useWriteNote';
import type { Note } from './useCustomer';

// The separator is punctuation, not words, so it does not belong in the
// resource files — but it does not belong typed between tags either, where
// no-hardcoded-strings catches it and is right to.
const SEPARATOR = ' · ';

export function CustomerScreenPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { id = '' } = useParams();
  const { status, error, screen, reload } = useCustomer(id);
  const note = useWriteNote(id);
  const grant = useGrantSignIn(id);
  // The notes route returns an author id and no name, the way the queue
  // returned an assignee id. The screen that needs the name is the screen with
  // the list, so it resolves it rather than the API growing a join.
  const staff = useAssignees();

  const [draft, setDraft] = useState('');
  const [missing, setMissing] = useState(false);
  // Notes added since the screen loaded. The POST answers with the note it
  // made, so it is appended to what is already in hand — reloading everything
  // to see one new line is the thing the criterion forbids.
  const [added, setAdded] = useState<Note[]>([]);
  useEffect(() => setAdded([]), [screen]);

  const submit = async () => {
    if (isBlank(draft)) {
      setMissing(true);
      return;
    }
    setMissing(false);
    const written = await note.write(draft).catch(() => null);
    if (written) {
      setAdded((current) => [...current, written]);
      setDraft('');
    }
  };

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
  const allNotes = [...notes.items, ...added];

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

      <Heading level={2}>{t.customerScreen.signInHeading}</Heading>

      {/* An action that will certainly be refused is worse than no action, so
          a customer who already has one gets a statement instead of a button. */}
      {customer.hasSignIn || grant.granted ? (
        grant.granted ? (
          <Card>
            <Stack gap={2}>
              {/* Once, in full, unmasked. The agent is on the phone and has to
                  read it out; nothing can fetch it again, and the sentence
                  above it says so before the password rather than after. */}
              <Text>{t.customerScreen.signInReady}</Text>
              <Text variant="muted">{t.customerScreen.signInEmail}</Text>
              <Text>
                <Isolated>{grant.granted.user.email}</Isolated>
              </Text>
              <Text variant="muted">{t.customerScreen.signInPassword}</Text>
              <Text>
                <Isolated>{grant.granted.initialPassword}</Isolated>
              </Text>
            </Stack>
          </Card>
        ) : (
          <Text variant="muted">{t.customerScreen.signInAlready}</Text>
        )
      ) : (
        <Stack gap={2}>
          <Text variant="muted">{t.customerScreen.signInNone}</Text>
          {/* Disabled while in flight, because this creates an account. */}
          <Button disabled={grant.status === 'loading'} onClick={grant.grant}>
            {grant.status === 'loading'
              ? t.customerScreen.signInGranting
              : t.customerScreen.signInGrant}
          </Button>
          {grant.status === 'error' && grant.error ? (
            <ErrorState
              title={t.customerScreen.signInFailed}
              body={t.errors[grant.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
            />
          ) : null}
        </Stack>
      )}

      <Heading level={2}>{t.customerScreen.notes}</Heading>

      <Stack gap={2}>
        <Field
          id="note"
          label={t.customerScreen.noteLabel}
          error={missing ? t.customerScreen.noteRequired : undefined}
        >
          {({ id: fieldId, describedBy, invalid }) => (
            <TextArea
              id={fieldId}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              placeholder={t.customerScreen.notePlaceholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          )}
        </Field>
        <Button disabled={note.status === 'loading'} onClick={() => void submit()}>
          {note.status === 'loading' ? t.customerScreen.noteSubmitting : t.customerScreen.noteSubmit}
        </Button>
        {note.status === 'error' && note.error ? (
          <ErrorState
            title={t.customerScreen.noteFailed}
            body={t.errors[note.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          />
        ) : null}
      </Stack>

      {allNotes.length === 0 ? (
        <Text variant="muted">{t.customerScreen.noNotes}</Text>
      ) : (
        <Stack gap={3}>
          {allNotes.map((entry) => (
            <Card key={entry.id}>
              <Stack gap={1}>
                <Text>{entry.body}</Text>
                {/* Who and when. A note nobody can attribute is a note nobody
                    trusts (BR-2), and the time is in the reader's locale
                    rather than the stored UTC (BR-3). */}
                <Text variant="muted">
                  {[
                    formatDate(entry.createdAt),
                    `${t.customerScreen.noteBy} ${
                      entry.authorId === null
                        ? t.customerScreen.noteBySystem
                        : (staff.nameFor(entry.authorId) ?? entry.authorId)
                    }`,
                  ].join(SEPARATOR)}
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
