import { Isolated, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';

// The window the API answered about, exactly as it sent it back.
export type ReportWindow = {
  timeZone: string;
  from: string;
  to: string;
  startUtc: string;
  endUtc: string;
} | null;

// The period a report covers, read from the ANSWER and never from what was
// asked for.
//
// That is the whole point of the API echoing its window. With the label built
// from client state and the numbers from the response, a slow request leaves
// last period's numbers under this period's label — the failure the criterion
// forbids, inverted and harder to see. One source for both, and they cannot
// disagree.
//
// It also settles "today": whichever day the API decided from its own clock,
// not the browser's, which is a different clock and will differ.
export function PeriodSentence({ window }: { window: ReportWindow }) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();

  // Null is the ordinary answer when nothing was asked for — a snapshot, and a
  // snapshot has no period to state.
  if (window === null) return null;

  // Formatted IN THE REPORT'S ZONE, not the browser's. The two are normally
  // the same — the browser is where the zone came from — and when they are
  // not, this label is the one that must not drift: it says "read in
  // Africa/Cairo" a few words later, and a date rendered in some other zone
  // beside that sentence is a label arguing with itself. `startUtc` for a
  // Cairo today is 21:00Z the day BEFORE, so the browser's zone would often
  // name the wrong day outright.
  const day = (iso: string) =>
    formatDate(iso, { dateStyle: 'medium', timeZone: window.timeZone });
  // The end instant is the start of the day AFTER the last one included, so
  // the date a reader should see is one day back from it.
  const lastDay = new Date(Date.parse(window.endUtc) - 1).toISOString();

  return (
    <Text variant="muted">
      {window.from === window.to ? (
        <>
          {t.reportPeriod.oneDay} <Isolated>{day(window.startUtc)}</Isolated>
        </>
      ) : (
        <>
          {t.reportPeriod.fromLabel} <Isolated>{day(window.startUtc)}</Isolated>{' '}
          {t.reportPeriod.toLabel} <Isolated>{day(lastDay)}</Isolated>
        </>
      )}
      {' · '}
      {/* A zone id is a left-to-right run with a slash in it, and in an Arabic
          paragraph the bidi algorithm will take the punctuation around it as
          part of the run unless it is isolated (L-51). */}
      {t.reportPeriod.zoneLabel} <Isolated>{window.timeZone}</Isolated>
    </Text>
  );
}
