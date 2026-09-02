import {
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Skeleton,
  Stack,
  Text,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { useMe } from '../../shared/session/use-me';
import { KINDS, usePromiseShare } from './usePromiseShare';
import type { ClockKind, KindShare } from './usePromiseShare';
import { shareSentence } from './promise-share-sentence';

// The two promises, each labelled as the promise it is. Never "SLA": that is a
// word for the mechanism, and the reader is being told whether the desk
// answered people and whether it fixed their problem — two different questions
// about the same ticket.
const LABEL: Record<ClockKind, 'firstResponseLabel' | 'resolutionLabel'> = {
  first_response: 'firstResponseLabel',
  resolution: 'resolutionLabel',
};

export function PromiseSharePage() {
  const { t } = useTranslation();
  const { formatNumber } = useFormatters();
  const { isAdmin } = useMe();
  const report = usePromiseShare({ enabled: isAdmin === true });
  const page = report.report;

  if (isAdmin === false) {
    return <EmptyState title={t.promiseReport.adminOnlyTitle} body={t.promiseReport.adminOnlyBody} />;
  }

  // The share arrives as a raw ratio, unrounded, so the counts beside it can be
  // checked against it. Rounding it for display is this screen's job — and
  // printing the counts next to it is what keeps that rounding honest.
  const asPercent = (share: number) =>
    formatNumber(share, { style: 'percent', maximumFractionDigits: 0 });

  const line = (kind: ClockKind, figures: KindShare) => (
    <Stack gap={1} key={kind}>
      <Text>{t.promiseReport[LABEL[kind]]}</Text>
      {figures.settled === 0 ? (
        // In words, and no percentage at all. Nothing settled is not the same
        // fact as nothing met, and the two are indistinguishable once a
        // percentage has been rounded onto a screen.
        <Text variant="muted">{t.promiseReport.noData}</Text>
      ) : (
        // The counts travel with the share, always: 100% of two tickets and
        // 100% of two hundred are different facts and look identical alone.
        <Text>
          {shareSentence(
            {
              share: asPercent(figures.share as number),
              met: formatNumber(figures.met),
              settled: formatNumber(figures.settled),
            },
            { t },
          )}
        </Text>
      )}
    </Stack>
  );

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.promiseReport.title}</Heading>

      {report.status === 'loading' && !page ? (
        <Skeleton lines={3} height="24px" label={t.states.loading} />
      ) : null}

      {report.status === 'error' && report.error ? (
        <ErrorState
          title={t.promiseReport.errorTitle}
          body={t.errors[report.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={report.reload}
          retryLabel={t.states.retry}
        />
      ) : null}

      {page ? (
        <Card>
          <Stack gap={3}>{KINDS.map((kind) => line(kind, page.kinds[kind]))}</Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
