import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Input,
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
import { useCorrectContacts } from './useCorrectContacts';
import type { Customer, Note } from './useCustomer';

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

  const correction = useCorrectContacts(id);
  // The customer as this screen has corrected it. The write answers with the
  // customer, so the card follows the answer rather than reloading the screen
  // — a reload would also throw away a half-typed note in the composer below.
  const [corrected, setCorrected] = useState<Customer | null>(null);
  // What is in the three fields. Seeded from the customer when it arrives and
  // owned by the form afterwards: a value re-derived on every render would
  // undo somebody's typing the moment anything else on the page changed.
  const [contacts, setContacts] = useState<Record<'name' | 'email' | 'phone', string> | null>(null);

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

  const { tickets, notes } = screen;
  // The corrected one where there is one, so the heading, the form and the
  // sign-in card all read the same customer.
  const customer = corrected ?? screen.customer;
  const allNotes = [...notes.items, ...added];

  // Seeded once, from whichever customer is current. Not derived on every
  // render: a value recomputed from the customer would undo somebody's typing
  // the moment a note was added beside it.
  const held = contacts ?? {
    name: customer.name,
    email: customer.email ?? '',
    phone: customer.phone ?? '',
  };
  const edit = (field: 'name' | 'email' | 'phone', value: string) =>
    setContacts({ ...held, [field]: value });

  // Only what somebody edited. A blank field means "no value" and travels as
  // null, which the API treats as an ordinary value — the same shape the
  // ticket controls use for nobody and no category.
  const orNull = (value: string) => (value.trim() === '' ? null : value);
  const patch: Record<string, string | null> = {};
  if (held.name !== customer.name) patch.name = held.name;
  if (orNull(held.email) !== (customer.email ?? null)) patch.email = orNull(held.email);
  if (orNull(held.phone) !== (customer.phone ?? null)) patch.phone = orNull(held.phone);
  const changed = Object.keys(patch).length > 0;
  const marked = (field: string) =>
    correction.status === 'error' && correction.error?.fields?.includes(field);

  return (
    <Stack gap={4}>
      <Heading level={1}>{customer.name}</Heading>

      {/* The details, and the way to correct them. They were read-only text
          until now; an agent who mishears an address is the person who should
          be able to fix it, and a second screen for three fields would be a
          second place a customer is read.

          The bidi isolation the read-only card had must not be lost with it.
          A <bdi> stopped an Arabic paragraph from reordering a phone number;
          an input inherits the document's direction and would reorder it just
          the same, so every field carries dir="auto" — which is what <bdi>
          does, applied to a value somebody can edit: the content decides,
          so a phone number reads left to right and an Arabic name does not. */}
      <Card>
        <Stack gap={2}>
          <Text variant="muted">{t.customerScreen.contacts}</Text>

          <Field
            id="customer-name"
            label={t.customerScreen.nameLabel}
            error={marked('name') ? t.errors.VALIDATION_FAILED : undefined}
          >
            {({ id: fieldId, describedBy, invalid }) => (
              <Input
                id={fieldId}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                dir="auto"
                value={held.name}
                onChange={(event) => edit('name', event.target.value)}
              />
            )}
          </Field>

          <Field
            id="customer-email"
            label={t.customerScreen.emailLabel}
            error={marked('email') ? t.errors.VALIDATION_FAILED : undefined}
          >
            {({ id: fieldId, describedBy, invalid }) => (
              // Deliberately not type="email". The browser would refuse to
              // submit and the API's rule would never run, and the sentence
              // somebody reads would be the browser's — wrong language,
              // unstyled, outside the resource files (L-55).
              <Input
                id={fieldId}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder={t.customerScreen.noEmail}
                dir="auto"
                value={held.email}
                onChange={(event) => edit('email', event.target.value)}
              />
            )}
          </Field>

          <Field
            id="customer-phone"
            label={t.customerScreen.phoneLabel}
            error={marked('phone') ? t.errors.VALIDATION_FAILED : undefined}
          >
            {({ id: fieldId, describedBy, invalid }) => (
              <Input
                id={fieldId}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder={t.customerScreen.noPhone}
                dir="auto"
                value={held.phone}
                onChange={(event) => edit('phone', event.target.value)}
              />
            )}
          </Field>

          <Button
            variant="secondary"
            // Nothing to save is not an action. The API refuses a correction
            // that corrects nothing, and offering the button would invite
            // somebody to press it and read a refusal that was their own
            // screen's fault.
            disabled={!changed || correction.status === 'loading'}
            onClick={() => {
              correction
                .correct(patch)
                .then((saved) => {
                  setCorrected(saved);
                  // Re-seeded from the answer, so a value the API trimmed or
                  // normalised is what the field then shows.
                  setContacts({
                    name: saved.name,
                    email: saved.email ?? '',
                    phone: saved.phone ?? '',
                  });
                })
                .catch(() => {});
            }}
          >
            {correction.status === 'loading'
              ? t.customerScreen.contactsSaving
              : t.customerScreen.contactsSave}
          </Button>

          {correction.status === 'error'
          && correction.error
          && !correction.error.fields?.length ? (
            <ErrorState
              title={t.customerScreen.contactsFailed}
              body={t.errors[correction.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
            />
          ) : null}
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
