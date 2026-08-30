import { useState } from 'react';

import { Button, Card, ErrorState, Field, Heading, Isolated, Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n';
import { useAddCustomer } from './useAddCustomer';

// The empty form, as one object, so "add another" is one assignment and there
// is one place to read what blank means. Three fields, not four: the customers
// table has an address column that the API neither writes nor returns, so a
// fourth input would post a value nothing stores and render one nothing sends.
const BLANK = { name: '', email: '', phone: '' };

export function AddCustomerPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const add = useAddCustomer();
  const [form, setForm] = useState(BLANK);

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // The API names the field; this decides which input wears the mark. The
  // sentence comes from the shared code map and is never composed from these
  // names — a message assembled on the client is the contract in two places.
  const marked = (field: string) =>
    add.status === 'error' && add.error?.fields?.includes(field)
      ? t.errors.VALIDATION_FAILED
      : undefined;

  const busy = add.status === 'loading';

  if (add.status === 'success' && add.customer) {
    const customer = add.customer;
    return (
      <Stack gap={4}>
        <Heading level={1}>{t.customers.createdTitle}</Heading>
        {/* The customer itself, not a sentence saying it worked. The agent is
            still on the phone and needs the id to say out loud; a message
            cannot be read back. */}
        <Card>
          <Stack gap={2}>
            <Text variant="muted">{t.customers.createdId}</Text>
            <Text>{customer.id}</Text>
            <Text variant="muted">{t.customers.name}</Text>
            <Text>{customer.name}</Text>
            <Text variant="muted">{t.customers.email}</Text>
            {/* Left-to-right runs in a paragraph that may be right-to-left,
                isolated for the reason the list rows are. */}
            <Text>
              <Isolated>{customer.email ?? t.customers.noEmail}</Isolated>
            </Text>
            <Text variant="muted">{t.customers.phone}</Text>
            <Text>
              <Isolated>{customer.phone ?? t.customers.noPhone}</Isolated>
            </Text>
            <Text variant="muted">{t.customers.createdAt}</Text>
            <Text>{formatDate(customer.createdAt)}</Text>
          </Stack>
        </Card>
        <Button
          variant="secondary"
          onClick={() => {
            setForm(BLANK);
            add.reset();
          }}
        >
          {t.customers.addAnother}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level={1}>{t.customers.addTitle}</Heading>
      <Text variant="muted">{t.customers.addSubtitle}</Text>

      {/* Only when the refusal named no field. When it named some, the marks
          beside those inputs carry the same sentence, and a banner repeating
          it says nothing the fields have not. */}
      {add.status === 'error' && add.error && !add.error.fields?.length ? (
        <ErrorState
          title={t.states.errorTitle}
          body={t.errors[add.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const email = form.email.trim();
          const phone = form.phone.trim();
          add.submit({
            name: form.name.trim(),
            // The spread is what makes blank mean absent. Not `email: ''`, and
            // not `email: null` — the field is simply not part of the request.
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          });
        }}
      >
        <Stack gap={3}>
          <Field
            id="name"
            label={t.customers.name}
            value={form.name}
            error={marked('name')}
            onChange={(event) => set('name', event.target.value)}
          />
          <Field
            id="email"
            label={t.customers.emailOptional}
            value={form.email}
            error={marked('email')}
            onChange={(event) => set('email', event.target.value)}
          />
          <Field
            id="phone"
            label={t.customers.phoneOptional}
            value={form.phone}
            error={marked('phone')}
            onChange={(event) => set('phone', event.target.value)}
          />

          {/* Disabled while in flight, because this POST creates a row: a
              second press is a second customer, not a retry. */}
          <Button type="submit" disabled={busy}>
            {busy ? t.customers.adding : t.customers.add}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
