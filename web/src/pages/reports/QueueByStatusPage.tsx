import {
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
import { useMe } from '../../shared/session/use-me';
import { STATUSES, useQueueByStatus } from './useQueueByStatus';
import type { TicketStatus } from './useQueueByStatus';
import './QueueByStatusPage.css';

// One leaf per status, named here so a seventh status is a compile error in
// this file rather than a raw `pending` on the screen. There is no runtime
// fallback for an unknown key and there should not be: the API returns exactly
// these six, and a dev-only branch would be a rendering path nobody tests.
const LABEL: Record<TicketStatus, keyof ReturnType<typeof useTranslation>['t']['queueReport']> = {
  new: 'statusNew',
  open: 'statusOpen',
  pending: 'statusPending',
  resolved: 'statusResolved',
  closed: 'statusClosed',
  reopened: 'statusReopened',
};

export function QueueByStatusPage() {
  const { t } = useTranslation();
  const { formatNumber } = useFormatters();
  const { isAdmin } = useMe();
  // Not until we know. `isAdmin` is undefined while /me is in flight, and a
  // request fired then would be refused for somebody who turns out to be an
  // admin a moment later.
  const report = useQueueByStatus({ enabled: isAdmin === true });
  // Bound once: TypeScript loses the narrowing inside the map callback below,
  // and re-checking `report.report` at every use reads as if it might change
  // mid-render.
  const page = report.report;

  // Courtesy, not enforcement: the API refuses a non-admin whatever this draws
  // (SC-2). Undefined until /me answers, so nothing flashes.
  if (isAdmin === false) {
    return <EmptyState title={t.queueReport.adminOnlyTitle} body={t.queueReport.adminOnlyBody} />;
  }

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.queueReport.title}</Heading>

      {report.status === 'loading' && !page ? (
        <Skeleton lines={6} height="24px" label={t.states.loading} />
      ) : null}

      {report.status === 'error' && report.error ? (
        <ErrorState
          title={t.queueReport.errorTitle}
          body={t.errors[report.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={report.reload}
          retryLabel={t.states.retry}
        />
      ) : null}

      {page ? (
        <Card>
          <Stack gap={2}>
            {/* A desk with nothing on it. Said in a sentence, above the six
                zeros rather than instead of them: the zeros ARE the answer,
                and a screen that replaced them with an empty state would put
                back the idea the API was built to remove — that a status with
                no tickets might simply be missing. */}
            {page.total === 0 ? (
              <Text variant="muted">{t.queueReport.nothingInTheQueue}</Text>
            ) : null}

            <dl className="queue-report">
              {STATUSES.map((status) => (
                <div className="queue-report__row" key={status}>
                  <dt>{t.queueReport[LABEL[status]]}</dt>
                  {/* Through formatNumber, so the digits are the reader's —
                      Arabic here is ar-EG on purpose (format.ts:12). */}
                  <dd>{formatNumber(page.counts[status])}</dd>
                </div>
              ))}
            </dl>

            {/* The number is isolated. It sits at the end of a label, and in
                Arabic the direction of the surrounding text decides where a
                trailing number lands unless something says otherwise — the
                same reason the history and pager sentences wrap their slots
                (L-51). */}
            <Text variant="muted">
              {t.queueReport.totalLabel} <Isolated>{formatNumber(page.total)}</Isolated>
            </Text>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
