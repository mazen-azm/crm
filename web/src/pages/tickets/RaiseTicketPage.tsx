import { useState } from 'react';

import {
  Button,
  Card,
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
import { useRaiseTicket, type Priority } from './useRaiseTicket';
import { useTicketCategories } from './useTicketCategories';

const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];

// The empty form. Kept as one object so "raise another" is one assignment
// rather than five, and so there is one place to read what a blank form is.
const BLANK = { customerId: '', categoryId: '', priority: 'normal' as Priority, subject: '', body: '' };

export function RaiseTicketPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const categories = useTicketCategories();
  const raise = useRaiseTicket();
  const [form, setForm] = useState(BLANK);

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // The API names the field; this decides which input wears the mark. The
  // sentence itself comes from the shared code map, never composed from these
  // names — a message assembled on the client is the contract in two places.
  const marked = (field: string) =>
    raise.status === 'error' && raise.error?.fields?.includes(field)
      ? t.errors.VALIDATION_FAILED
      : undefined;

  const busy = raise.status === 'loading';
  const priorityLabel: Record<Priority, string> = {
    low: t.raiseTicket.priorityLow,
    normal: t.raiseTicket.priorityNormal,
    high: t.raiseTicket.priorityHigh,
    urgent: t.raiseTicket.priorityUrgent,
  };

  if (raise.status === 'success' && raise.ticket) {
    const ticket = raise.ticket;
    const category = categories.categories.find((c) => c.id === ticket.categoryId);
    return (
      <Stack gap={4}>
        <Heading level={1}>{t.raiseTicket.createdTitle}</Heading>
        {/* The ticket itself, not a sentence saying it worked. An agent needs
            the reference to say out loud, and a message cannot be read back. */}
        <Card>
          <Stack gap={2}>
            <Text variant="muted">{t.raiseTicket.createdId}</Text>
            <Text>{ticket.id}</Text>
            <Text variant="muted">{t.raiseTicket.createdSubject}</Text>
            <Text>{ticket.subject}</Text>
            <Text variant="muted">{t.raiseTicket.createdStatus}</Text>
            <Text>{ticket.status}</Text>
            <Text variant="muted">{t.raiseTicket.createdPriority}</Text>
            <Text>{priorityLabel[ticket.priority]}</Text>
            <Text variant="muted">{t.raiseTicket.createdCategory}</Text>
            <Text>{category?.name ?? t.raiseTicket.categoryNone}</Text>
            <Text variant="muted">{t.raiseTicket.createdAt}</Text>
            <Text>{formatDate(ticket.createdAt)}</Text>
          </Stack>
        </Card>
        <Button
          variant="secondary"
          onClick={() => {
            setForm(BLANK);
            raise.reset();
          }}
        >
          {t.raiseTicket.raiseAnother}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level={1}>{t.raiseTicket.title}</Heading>
      <Text variant="muted">{t.raiseTicket.subtitle}</Text>

      {raise.status === 'error' && raise.error ? (
        <ErrorState
          title={t.states.errorTitle}
          body={t.errors[raise.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          raise.submit({
            customerId: form.customerId.trim(),
            // '' is the "no category" option, and the API wants null for it —
            // an empty string would be a category id that cannot exist.
            categoryId: form.categoryId === '' ? null : form.categoryId,
            priority: form.priority,
            subject: form.subject,
            body: form.body,
          });
        }}
      >
        <Stack gap={3}>
          <Field
            id="customerId"
            label={t.raiseTicket.customerId}
            value={form.customerId}
            error={marked('customerId')}
            onChange={(event) => set('customerId', event.target.value)}
          />

          <Field id="category" label={t.raiseTicket.category} error={marked('categoryId')}>
            {({ id, describedBy, invalid }) =>
              categories.status === 'loading' ? (
                <Skeleton lines={1} height="40px" label={t.states.loading} />
              ) : categories.status === 'error' ? (
                <ErrorState
                  title={t.raiseTicket.categoryError}
                  body={t.errors[categories.error?.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
                  onRetry={categories.reload}
                  retryLabel={t.states.retry}
                />
              ) : (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={form.categoryId}
                  onChange={(event) => set('categoryId', event.target.value)}
                >
                  <option value="">{t.raiseTicket.categoryNone}</option>
                  {categories.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )
            }
          </Field>

          <Field id="priority" label={t.raiseTicket.priority} error={marked('priority')}>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={form.priority}
                onChange={(event) => set('priority', event.target.value as Priority)}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel[priority]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="subject"
            label={t.raiseTicket.subject}
            value={form.subject}
            error={marked('subject')}
            onChange={(event) => set('subject', event.target.value)}
          />

          <Field id="body" label={t.raiseTicket.body} error={marked('body')}>
            {({ id, describedBy, invalid }) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={form.body}
                onChange={(event) => set('body', event.target.value)}
              />
            )}
          </Field>

          {/* Disabled while in flight, because this POST creates a row: a
              second press is a second ticket, not a retry. */}
          <Button type="submit" disabled={busy}>
            {busy ? t.raiseTicket.submitting : t.raiseTicket.submit}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
