import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Isolated,
  Heading,
  Skeleton,
  Stack,
  Text,
} from '../../shared/ui';
import { PAGE_SIZE, useCustomerSearch } from './useCustomerSearch';
import type { Customer } from './useCustomerSearch';
import './CustomersPage.css';

function Row({ customer, t }: { customer: Customer; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <li className="customer-list__row">
      {/* The name is the way in. Without it the customer screen exists and
          nothing reaches it — a route nobody can navigate to is a route that
          is only visible to whoever wrote it. */}
      <Link to={`/customers/${customer.id}`}>
        <Text>{customer.name}</Text>
      </Link>
      <div className="customer-list__contact">
        {/* Both are left-to-right runs sitting in a paragraph that may be
            right-to-left. Without isolation the phone number's groups reorder
            and the leading + lands at the far end. */}
        <Text variant="muted">
          <Isolated>{customer.email ?? t.customers.noEmail}</Isolated>
        </Text>
        <Text variant="muted">
          <Isolated>{customer.phone ?? t.customers.noPhone}</Isolated>
        </Text>
      </div>
    </li>
  );
}

export function CustomersPage() {
  const { t } = useTranslation();
  const { countOf } = useFormatters();
  const { status, page, error, query, search } = useCustomerSearch();
  const [term, setTerm] = useState('');

  // The first page arrives without anybody asking: an agent opening this
  // screen wants the customers, not an empty box. An empty term is what the
  // API treats as "list them", which CRM-55 shipped with a test for it.
  useEffect(() => {
    void search('').catch(() => {});
  }, [search]);

  const busy = status === 'loading';
  const shown = page?.items ?? [];

  return (
    <Stack as="section" gap={5}>
      <Heading level={2}>{t.customers.title}</Heading>

      <Stack
        as="form"
        direction="row"
        gap={2}
        align="end"
        onSubmit={(event) => {
          event.preventDefault();
          // On submit, not on every keystroke. An agent is usually typing a
          // number read aloud to them; eleven keystrokes would be ten thrown
          // away requests and ten partial-match lists flickering under
          // somebody trying to read one.
          void search(term.trim()).catch(() => {});
        }}
      >
        <Field
          id="customer-search"
          label={t.customers.searchLabel}
          placeholder={t.customers.searchPlaceholder}
          name="q"
          value={term}
          disabled={busy}
          onChange={(event) => setTerm(event.target.value)}
        />
        <Button type="submit" disabled={busy}>
          {busy ? t.customers.searching : t.customers.search}
        </Button>
        {/* Beside the search, not only under an empty result: an agent taking
            a call from somebody they already know is not on file should not
            have to search for nothing first to be offered the form. */}
        <Link to="/customers/new">{t.customers.addLink}</Link>
      </Stack>

      {/* One of four, off useRequest's status. A success with nothing in it is
          the empty state — not a fifth status. */}
      {busy ? (
        // Shaped like the rows it becomes, so the page does not jump when the
        // answer arrives under somebody's cursor.
        <Skeleton lines={5} height="64px" label={t.states.loading} />
      ) : null}

      {status === 'error' && error ? (
        <ErrorState
          title={t.customers.errorTitle}
          body={t.errors[error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={() => void search(query.term, query.offset).catch(() => {})}
          retryLabel={t.states.retry}
        />
      ) : null}

      {status === 'success' && shown.length === 0 ? (
        <EmptyState
          title={t.customers.emptyTitle}
          body={t.customers.emptyBody}
          action={
            // Two, because a search that matched nothing has two honest
            // endings: the name was mistyped, or the caller is not on file.
            // Adding one used to be a button that went nowhere and was left
            // out for that reason; the screen it needs now exists.
            <Stack direction="row" gap={2} align="start">
              <Button
                variant="secondary"
                onClick={() => {
                  setTerm('');
                  void search('').catch(() => {});
                }}
              >
                {t.customers.emptyAction}
              </Button>
              <Link to="/customers/new">{t.customers.addLink}</Link>
            </Stack>
          }
        />
      ) : null}

      {status === 'success' && shown.length > 0 && page ? (
        <Stack gap={3}>
          <Text variant="muted">
            {countOf(page.total, t.customers)}
          </Text>

          <ul className="customer-list">
            {shown.map((customer) => (
              <Row key={customer.id} customer={customer} t={t} />
            ))}
          </ul>

          {/* The API's window, not the screen's. It says what it gave and from
              where; this only asks for the next one. */}
          <Stack direction="row" gap={2} align="start">
            <Button
              variant="secondary"
              disabled={page.offset === 0}
              onClick={() =>
                void search(query.term, Math.max(0, page.offset - PAGE_SIZE)).catch(() => {})
              }
            >
              {t.customers.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page.offset + page.items.length >= page.total}
              onClick={() => void search(query.term, page.offset + PAGE_SIZE).catch(() => {})}
            >
              {t.customers.next}
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
