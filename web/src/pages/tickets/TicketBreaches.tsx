import { Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import './TicketBreaches.css';

type Breach = { kind: string; breachedAt: string };

// What a row says about a promise that was missed.
//
// The two kinds are drawn differently, because they are different promises and
// an agent's next action differs: a missed first response means nobody has
// spoken to this customer yet, and a missed resolution means somebody has and
// it is still not finished. A single "late" mark would flatten that into one
// word and lose the half that decides what to do next.
//
// Nothing here computes. The array comes from the API, which reads it from the
// stored rows; a screen that worked lateness out for itself would be a second
// answer to what late means, and one that disagreed with the sweep the moment
// a pause was involved.
export function TicketBreaches({ breaches }: { breaches: Breach[] }) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();

  if (breaches.length === 0) return null;

  return (
    <ul className="ticket-breaches">
      {breaches.map((breach) => (
        <li
          className={['ticket-breaches__mark', `ticket-breaches__mark--${breach.kind}`].join(' ')}
          key={breach.kind}
        >
          {/* The caption stays. The surface is what somebody scanning sees;
              the words are what somebody using a screen reader gets, and what
              anybody gets who cannot tell the two colours apart. */}
          <Text>
            {breach.kind === 'first_response'
              ? t.ticketBreach.firstResponse
              : t.ticketBreach.resolution}
          </Text>
          <Text variant="muted">
            {`${t.ticketBreach.missedAt} ${formatDate(breach.breachedAt, { dateStyle: 'medium', timeStyle: 'short' })}`}
          </Text>
        </li>
      ))}
    </ul>
  );
}
