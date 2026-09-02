import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Skeleton,
  Stack,
  Text,
} from '../../shared/ui';
import { useMemo, useState } from 'react';

import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { useMe } from '../../shared/session/use-me';
import { PeriodSentence } from './period-sentence';
import { readerZone } from './reader-zone';
import { PERIODS, buildPeriod } from './report-period';
import type { PeriodKey } from './report-period';
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
  // Read once per mount. A session that crosses a daylight-saving change keeps
  // the same zone ID, which is right: the zone is the thing that is stable, and
  // the offset is what moves inside it.
  const timeZone = useMemo(() => readerZone(), []);
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const period = useMemo(() => buildPeriod(periodKey, timeZone), [periodKey, timeZone]);
  const report = usePromiseShare({ enabled: isAdmin === true, timeZone, period });
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

      <Stack direction="row" gap={2} align="start">
        {PERIODS.map((key) => (
          <Button
            key={key}
            variant={key === periodKey ? 'primary' : 'secondary'}
            aria-pressed={key === periodKey}
            onClick={() => setPeriodKey(key)}
          >
            {t.reportPeriod[key]}
          </Button>
        ))}
      </Stack>

      {/* Read from the ANSWER, so the period and the numbers cannot disagree
          — and null while nothing has arrived, so no label stands over
          somebody else's figures. */}
      <PeriodSentence window={page?.window ?? null} />

      {/* No `&& page` here on purpose. While a new period is in flight the
          skeleton replaces the last one's figures, so a number is never shown
          under a label it does not belong to. */}
      {report.status === 'loading' ? (
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

      {/* `status !== 'loading'` and not merely `page`: useRequest keeps the
          last answer while the next request is in flight, so gating on `page`
          alone leaves the previous period's figures on screen UNDER the new
          period's label — with a skeleton above them, which looks like a
          screen loading more rather than one showing the wrong thing. */}
      {page && report.status !== 'loading' ? (
        <Card>
          <Stack gap={3}>{KINDS.map((kind) => line(kind, page.kinds[kind]))}</Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
