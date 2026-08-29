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
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
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

function Row({ ticket, t, formatDate }: { ticket: Ticket; t: T; formatDate: (v: string) => string }) {
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
            ticket.assigneeId ?? t.ticketQueue.unassigned,
            formatDate(ticket.createdAt),
          ].join(SEPARATOR)}
        </Text>
      </Stack>
    </Card>
  );
}

export function TicketQueuePage() {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useFormatters();
  const queue = useTicketQueue();
  const categories = useTicketCategories();

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
        align="end"
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
          <Text variant="muted">
            {formatNumber(page.total)} {t.ticketQueue.resultCount}
          </Text>
          {/* Whatever the API returned is what is shown. No filter, no sort,
              no slice here — the total would be right and the rows wrong. */}
          {page.items.map((ticket) => (
            <Row key={ticket.id} ticket={ticket} t={t} formatDate={formatDate} />
          ))}
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
