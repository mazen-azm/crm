import { useEffect, useState } from 'react';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Heading,
  Select,
  Skeleton,
  Stack,
  Text,
  TextArea,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { useAssignees } from './useAssignees';
import { useAssignTicket } from './useAssignTicket';
import { useChangeStatus, isBlank } from './useChangeStatus';
import { useTicketCategories } from './useTicketCategories';
import {
  PAGE_SIZE,
  PRIORITIES,
  STATUSES,
  UNASSIGNED,
  useTicketQueue,
  type Filters,
  type Ticket,
} from './useTicketQueue';

type T = ReturnType<typeof useTranslation>['t'];

// One separator, in one place. It is punctuation rather than words, so it does
// not belong in the resource files — but it does not belong inline either.
const SEPARATOR = ' · ';

// The picker's word for nobody. The wire value is null — 'none' is the queue
// FILTER's word for the same idea and the two must not be confused: one asks a
// question, the other performs a write.
const UNASSIGN = '__unassigned__';

const statusLabel = (t: T, status: string) =>
  ({
    new: t.ticketQueue.statusNew,
    open: t.ticketQueue.statusOpen,
    pending: t.ticketQueue.statusPending,
    resolved: t.ticketQueue.statusResolved,
    closed: t.ticketQueue.statusClosed,
    reopened: t.ticketQueue.statusReopened,
  })[status] ?? status;

const priorityLabel = (t: T, priority: string) =>
  ({
    low: t.ticketQueue.priorityLow,
    normal: t.ticketQueue.priorityNormal,
    high: t.ticketQueue.priorityHigh,
    urgent: t.ticketQueue.priorityUrgent,
  })[priority] ?? priority;

// The row assigns. There is no route that reads one ticket and no story that
// asks for a detail screen, and there does not need to be: the row already
// holds the ticket and its revision, which is everything the write needs. An
// agent assigns from the list they are looking at.
function Row({
  ticket,
  t,
  formatDate,
  assignees,
  onAssigned,
}: {
  ticket: Ticket;
  t: T;
  formatDate: (v: string) => string;
  assignees: ReturnType<typeof useAssignees>;
  onAssigned: (ticket: Ticket) => void;
}) {
  const assign = useAssignTicket();
  const move = useChangeStatus();
  const [choice, setChoice] = useState(ticket.assigneeId ?? UNASSIGN);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);

  const submit = async () => {
    const next = choice === UNASSIGN ? null : choice;
    // The response carries the ticket at its new revision, and the page holds
    // it. A screen that keeps the revision it loaded with refuses the agent's
    // own second assignment, and the bug looks like a race that is not there.
    const updated = await assign.assign(ticket, next).catch(() => null);
    if (updated) onAssigned(updated);
  };

  const stale = assign.status === 'error' && assign.error?.code === 'REVISION_MISMATCH';

  // The API always sends this and a test pins that it does. It is defaulted
  // anyway, and defaulted to NOTHING rather than to everything: an API old
  // enough not to send it is an API whose transition table this screen cannot
  // know, and offering moves that cannot be verified is worse than offering
  // none. Reading .length straight off it crashed the whole page against a
  // server started before the field existed — a blank screen for a missing
  // optional is the wrong failure.
  const moves = ticket.allowedTransitions ?? [];
  const moveStale = move.status === 'error' && move.error?.code === 'REVISION_MISMATCH';

  const submitMove = async () => {
    // The requirement is stated, not discovered by a 422. The API applies the
    // same test after trimming, so a round-trip here would return the answer
    // the screen already has.
    if (target === 'resolved' && isBlank(note)) {
      setNoteMissing(true);
      return;
    }
    setNoteMissing(false);
    const updated = await move.change(ticket, target, note).catch(() => null);
    if (updated) {
      setNote('');
      setTarget('');
      onAssigned(updated);
    }
  };

  return (
    <Card>
      <Stack gap={1}>
        <Text>{ticket.subject}</Text>
        {/* Joined in JS rather than written between tags: a separator typed
            into JSX is a string a reader sees, and no-hardcoded-strings
            catches it — correctly, since a comma is punctuation in one
            language and not in another. */}
        <Text variant="muted">
          {[
            statusLabel(t, ticket.status),
            priorityLabel(t, ticket.priority),
            assignees.nameFor(ticket.assigneeId) ?? t.ticketQueue.unassigned,
            formatDate(ticket.createdAt),
          ].join(SEPARATOR)}
        </Text>

        <Stack direction="row" gap={2}>
          <Field id={`assignee-${ticket.id}`} label={t.ticketAssign.label}>
            {({ id }) => (
              <Select
                id={id}
                value={choice}
                disabled={assignees.status !== 'success'}
                onChange={(event) => setChoice(event.target.value)}
              >
                {/* Returning a ticket to nobody is an assignment, not a
                    cleared field — so it is an option that sends null, not an
                    absent value. */}
                <option value={UNASSIGN}>{t.ticketQueue.unassigned}</option>
                {assignees.assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button
            variant="secondary"
            disabled={assign.status === 'loading' || choice === (ticket.assigneeId ?? UNASSIGN)}
            onClick={() => void submit()}
          >
            {assign.status === 'loading' ? t.ticketAssign.assigning : t.ticketAssign.submit}
          </Button>
        </Stack>

        {stale ? (
          // 409 is not "something went wrong". It means somebody else changed
          // the ticket, and the only useful next action is to look again.
          <ErrorState
            title={t.ticketAssign.staleTitle}
            body={t.errors.REVISION_MISMATCH}
            onRetry={() => window.location.reload()}
            retryLabel={t.ticketAssign.reload}
          />
        ) : null}

        {assign.status === 'error' && !stale && assign.error ? (
          <ErrorState
            title={t.ticketAssign.failedTitle}
            body={t.errors[assign.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          />
        ) : null}

        {ticket.resolutionNote ? (
          <Text variant="muted">{`${t.ticketStatus.resolvedNote}: ${ticket.resolutionNote}`}</Text>
        ) : null}

        {moves.length === 0 ? (
          <Text variant="muted">{t.ticketStatus.noMoves}</Text>
        ) : (
          <Stack gap={2}>
            <Stack direction="row" gap={2}>
              <Field id={`status-${ticket.id}`} label={t.ticketStatus.label}>
                {({ id }) => (
                  <Select id={id} value={target} onChange={(event) => setTarget(event.target.value)}>
                    <option value="">{t.ticketStatus.choose}</option>
                    {/* Only what the ticket says is legal from where it is.
                        The six statuses and their edges are not copied here —
                        the API sends them with the ticket, derived from the
                        same table the refusal reads. */}
                    {moves.map((next) => (
                      <option key={next} value={next}>
                        {statusLabel(t, next)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button
                variant="secondary"
                disabled={move.status === 'loading' || target === ''}
                onClick={() => void submitMove()}
              >
                {move.status === 'loading' ? t.ticketStatus.moving : t.ticketStatus.submit}
              </Button>
            </Stack>

            {target === 'resolved' ? (
              <Field
                id={`note-${ticket.id}`}
                label={t.ticketStatus.noteLabel}
                error={noteMissing ? t.ticketStatus.noteRequired : undefined}
              >
                {({ id, describedBy, invalid }) => (
                  <TextArea
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    placeholder={t.ticketStatus.notePlaceholder}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                )}
              </Field>
            ) : null}

            {moveStale ? (
              <ErrorState
                title={t.ticketStatus.staleTitle}
                body={t.errors.REVISION_MISMATCH}
                onRetry={() => window.location.reload()}
                retryLabel={t.ticketStatus.reload}
              />
            ) : null}

            {move.status === 'error' && !moveStale && move.error ? (
              <ErrorState
                title={t.ticketStatus.failedTitle}
                body={t.errors[move.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
              />
            ) : null}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

export function TicketQueuePage() {
  const { t } = useTranslation();
  const { formatDate, countOf } = useFormatters();
  const queue = useTicketQueue();
  const categories = useTicketCategories();
  const assignees = useAssignees();

  // Tickets this screen has changed since the page was fetched, so a row shows
  // the assignment that just happened and carries the revision that came back
  // with it. Cleared whenever a new page arrives — that page is fresher.
  const [updated, setUpdated] = useState<Record<string, Ticket>>({});
  useEffect(() => setUpdated({}), [queue.page]);

  // The form's own working copy, so typing into it does not rewrite the URL on
  // every keystroke. The URL is still the state — this is seeded from it, and
  // Apply is what writes back.
  const [draft, setDraft] = useState<Filters>(queue.filters);
  useEffect(() => setDraft(queue.filters), [queue.filters]);

  const busy = queue.status === 'loading';
  const page = queue.page;

  // Named, so an agent can see which filter is hiding the queue rather than
  // staring at an empty region and wondering (D-2).
  const active = [
    draft.status ? `${t.ticketQueue.filterStatus}: ${statusLabel(t, draft.status)}` : null,
    draft.priority ? `${t.ticketQueue.filterPriority}: ${priorityLabel(t, draft.priority)}` : null,
    draft.categoryId
      ? `${t.ticketQueue.filterCategory}: ${
          categories.categories.find((c) => c.id === draft.categoryId)?.name ?? draft.categoryId
        }`
      : null,
    draft.assigneeId
      ? `${t.ticketQueue.filterAssignee}: ${
          draft.assigneeId === UNASSIGNED ? t.ticketQueue.unassigned : draft.assigneeId
        }`
      : null,
  ].filter(Boolean) as string[];

  const set = (key: keyof Filters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value || undefined }));

  return (
    <Stack gap={4}>
      <Heading level={1}>{t.ticketQueue.title}</Heading>
      {/* The API orders by created_at DESC and takes no direction, so this is
          a statement rather than a control. A Select with one option is a
          control that cannot be operated. */}
      <Text variant="muted">{t.ticketQueue.newestFirst}</Text>

      <Stack
        as="form"
        direction="row"
        gap={2}
        onSubmit={(event) => {
          event.preventDefault();
          queue.apply(draft);
        }}
      >
        <Field id="filter-status" label={t.ticketQueue.filterStatus}>
          {({ id }) => (
            <Select id={id} value={draft.status ?? ''} onChange={(e) => set('status', e.target.value)}>
              <option value="">{t.ticketQueue.any}</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(t, status)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="filter-priority" label={t.ticketQueue.filterPriority}>
          {({ id }) => (
            <Select id={id} value={draft.priority ?? ''} onChange={(e) => set('priority', e.target.value)}>
              <option value="">{t.ticketQueue.any}</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabel(t, priority)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="filter-category" label={t.ticketQueue.filterCategory}>
          {({ id }) => (
            <Select id={id} value={draft.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">{t.ticketQueue.any}</option>
              {categories.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="filter-assignee" label={t.ticketQueue.filterAssignee}>
          {({ id }) => (
            <Select id={id} value={draft.assigneeId ?? ''} onChange={(e) => set('assigneeId', e.target.value)}>
              <option value="">{t.ticketQueue.any}</option>
              {/* 'none' is the API's word for unassigned. An empty value here
                  means "do not filter", which is a different question. */}
              <option value={UNASSIGNED}>{t.ticketQueue.unassigned}</option>
            </Select>
          )}
        </Field>

        <Button type="submit">{t.ticketQueue.apply}</Button>
      </Stack>

      {busy ? <Skeleton lines={5} height="64px" label={t.states.loading} /> : null}

      {queue.status === 'error' && queue.error ? (
        <ErrorState
          title={t.ticketQueue.errorTitle}
          body={t.errors[queue.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}

      {queue.status === 'success' && page && page.items.length === 0 ? (
        <EmptyState
          title={t.ticketQueue.emptyTitle}
          body={
            active.length > 0
              ? `${t.ticketQueue.emptyFiltered} ${active.join(SEPARATOR)}`
              : t.ticketQueue.emptyUnfiltered
          }
          action={
            active.length > 0 ? (
              <Button variant="secondary" onClick={queue.clear}>
                {t.ticketQueue.clear}
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {queue.status === 'success' && page && page.items.length > 0 ? (
        <Stack gap={3}>
          <Text variant="muted">{countOf(page.total, t.ticketQueue)}</Text>
          {/* Whatever the API returned is what is shown. No filter, no sort,
              no slice here — the total would be right and the rows wrong. */}
          {page.items.map((ticket) => {
            const shown = updated[ticket.id] ?? ticket;
            return (
              <Row
                key={shown.id}
                ticket={shown}
                t={t}
                formatDate={formatDate}
                assignees={assignees}
                onAssigned={(next) => setUpdated((current) => ({ ...current, [next.id]: next }))}
              />
            );
          })}
          <Stack direction="row" gap={2}>
            <Button
              variant="secondary"
              disabled={page.offset === 0}
              onClick={() => queue.goTo(Math.max(0, page.offset - PAGE_SIZE))}
            >
              {t.ticketQueue.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page.offset + page.items.length >= page.total}
              onClick={() => queue.goTo(page.offset + PAGE_SIZE)}
            >
              {t.ticketQueue.next}
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
