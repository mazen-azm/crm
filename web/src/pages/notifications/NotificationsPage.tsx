import { Link } from 'react-router-dom';

import { Button, Card, EmptyState, ErrorState, Heading, Skeleton, Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { useMe } from '../../shared/session/use-me';
import { useUnread } from '../../shared/session/unread-context';
import { useNotifications } from './useNotifications';
import { useMarkRead } from './useMarkRead';
import './NotificationsPage.css';

// What each kind of notification says. One place, so the screen does not grow
// a branch per kind at the point it renders one — and so the second kind, when
// a story writes it, is a line here rather than an `if` in the middle of a
// list.
const SENTENCE: Record<string, keyof ReturnType<typeof useTranslation>['t']['notifications']> = {
  'ticket.assigned': 'ticketAssigned',
};

export function NotificationsPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { isStaff } = useMe();
  const unread = useUnread();
  const list = useNotifications({ enabled: isStaff === true });
  const marking = useMarkRead();

  // Courtesy, not enforcement: the API refuses a customer whatever this draws
  // (SC-2). Undefined until /me answers, so nothing flashes.
  if (isStaff === false) {
    return <EmptyState title={t.notifications.staffOnlyTitle} body={t.notifications.staffOnlyBody} />;
  }

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.notifications.title}</Heading>

      {list.status === 'loading' && list.items.length === 0 ? (
        <Skeleton lines={3} height="48px" label={t.states.loading} />
      ) : null}

      {list.status === 'error' && list.error ? (
        <ErrorState
          title={t.notifications.errorTitle}
          body={t.errors[list.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={list.reload}
          retryLabel={t.states.retry}
        />
      ) : null}

      {list.status === 'success' && list.items.length === 0 ? (
        <EmptyState title={t.notifications.emptyTitle} body={t.notifications.emptyBody} />
      ) : null}

      {list.items.length > 0 ? (
        <ol className="notifications">
          {list.items.map((one) => (
            <li
              className={['notifications__item', one.readAt === null && 'notifications__item--unread']
                .filter(Boolean)
                .join(' ')}
              key={one.id}
            >
              <Card>
                <Stack gap={2}>
                  <Text>{t.notifications[SENTENCE[one.kind] ?? 'somethingHappened']}</Text>
                  {/* The ticket is one click away. The row carries an id and
                      nothing else — a subject copied when this was written
                      would be a subject that went stale. */}
                  <Link to={`/tickets?ticketId=${one.ticketId}`}>{t.notifications.openTicket}</Link>
                  <Text variant="muted">
                    {formatDate(one.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>

                  {one.readAt === null ? (
                    // Reading is deliberate. Opening the list marks nothing, or
                    // an agent who glanced at the screen would have dismissed
                    // everything on it.
                    <Button
                      variant="secondary"
                      disabled={marking.status === 'loading'}
                      onClick={() => {
                        marking
                          .mark(one.id)
                          .then((marked) => {
                            list.replace(marked);
                            // The shell's badge follows, from the answer
                            // rather than by asking again.
                            unread.markedOne();
                          })
                          .catch(() => {});
                      }}
                    >
                      {t.notifications.markRead}
                    </Button>
                  ) : (
                    <Text variant="muted">
                      {`${t.notifications.readAt} ${formatDate(one.readAt, { dateStyle: 'medium', timeStyle: 'short' })}`}
                    </Text>
                  )}
                </Stack>
              </Card>
            </li>
          ))}
        </ol>
      ) : null}

      {marking.status === 'error' && marking.error ? (
        <ErrorState
          title={t.notifications.markFailedTitle}
          body={t.errors[marking.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}

      {list.page && list.page.total > list.page.limit ? (
        <Stack direction="row" gap={2} align="start">
          <Button
            variant="secondary"
            disabled={list.offset === 0}
            onClick={() => list.load(Math.max(0, list.offset - list.page!.limit))}
          >
            {t.notifications.newer}
          </Button>
          <Button variant="secondary" disabled={!list.hasMore} onClick={() => list.load(list.offset + list.page!.limit)}>
            {t.notifications.older}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
