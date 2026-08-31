import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Heading,
  Input,
  Isolated,
  Select,
  Skeleton,
  Stack,
  Text,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useFormatters } from '../../shared/i18n/useFormatters';
import { useMe } from '../../shared/session/use-me';
import { useAssignees } from '../tickets/useAssignees';
import { historySentence } from '../tickets/history-sentence';
import { useAuditLog } from './useAuditLog';
import './AuditLogPage.css';

// Every entity the trail records, so the picker offers what exists rather than
// a free-text box somebody has to guess into. Read off the verbs the API
// writes; a new one appears here when a story adds it, which is a small edit
// and a visible one.
const ENTITIES = ['ticket', 'customer', 'customer_note', 'user', 'category', 'notification'] as const;

// The word for "nobody did this" as a filter value. The API's own sentinel —
// not invented here, and a comment saying so is cheaper than the next reader
// grepping for it.
const SYSTEM = 'system';

export function AuditLogPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { isAdmin } = useMe();
  // Not until we know. `isAdmin` is undefined while /me is in flight, and a
  // request fired then would be refused for somebody who turns out to be an
  // admin a moment later.
  const trail = useAuditLog({ enabled: isAdmin === true });
  // The staff list, so an actor id becomes a name. The same resolution the
  // ticket history does, and for the same reason: the trail stores ids and the
  // screen holding the list is the one that can spell them.
  const staff = useAssignees();

  // Courtesy, not enforcement: the API refuses a non-admin whatever this draws
  // (SC-2). Undefined until /me answers, so nothing flashes.
  if (isAdmin === false) {
    return <EmptyState title={t.auditLog.adminOnlyTitle} body={t.auditLog.adminOnlyBody} />;
  }

  const nameOf = (id: string | null) =>
    (id === null ? t.ticketHistory.systemActor : (staff.nameFor(id) ?? id));

  const filter = (name: 'actorId' | 'entity' | 'entityId' | 'from' | 'to') =>
    trail.filters[name] ?? '';

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.auditLog.title}</Heading>

      <Card>
        <Stack gap={2}>
          <Stack direction="row" gap={2} align="start">
            <Field id="audit-actor" label={t.auditLog.actorLabel}>
              {({ id }) => (
                <Select id={id} value={filter('actorId')} onChange={(e) => trail.set({ actorId: e.target.value })}>
                  <option value="">{t.auditLog.anyone}</option>
                  {/* The system is a choice, not an absence. These are the
                      rows an admin cannot ask a colleague about. */}
                  <option value={SYSTEM}>{t.ticketHistory.systemActor}</option>
                  {staff.assignees.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </Select>
              )}
            </Field>

            <Field id="audit-entity" label={t.auditLog.entityLabel}>
              {({ id }) => (
                <Select
                  id={id}
                  value={filter('entity')}
                  onChange={(e) => trail.set({ entity: e.target.value, entityId: null })}
                >
                  <option value="">{t.auditLog.anything}</option>
                  {ENTITIES.map((entity) => (
                    <option key={entity} value={entity}>{t.auditEntities[entity]}</option>
                  ))}
                </Select>
              )}
            </Field>
          </Stack>

          {/* Only once a thing is chosen. The API refuses an id without one,
              and offering the box before the picker invites the refusal. */}
          {filter('entity') ? (
            <Field id="audit-entity-id" label={t.auditLog.entityIdLabel}>
              {({ id }) => (
                <Input
                  id={id}
                  value={filter('entityId')}
                  placeholder={t.auditLog.entityIdPlaceholder}
                  onChange={(e) => trail.set({ entityId: e.target.value })}
                />
              )}
            </Field>
          ) : null}

          <Stack direction="row" gap={2} align="start">
            {/* type="date" is display, not validation: it does not refuse a
                submission, and the API owns what a date must be (L-55). The
                value it produces is a plain YYYY-MM-DD, which this widens to
                the instants the API compares against. */}
            <Field id="audit-from" label={t.auditLog.fromLabel}>
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={filter('from').slice(0, 10)}
                  onChange={(e) =>
                    trail.set({ from: e.target.value ? `${e.target.value}T00:00:00.000Z` : null })
                  }
                />
              )}
            </Field>
            <Field id="audit-to" label={t.auditLog.toLabel}>
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={filter('to').slice(0, 10)}
                  onChange={(e) =>
                    // The whole of the chosen day. A bound at midnight would
                    // exclude everything that happened on the day somebody
                    // asked for, which is not what "to" means to a reader.
                    trail.set({ to: e.target.value ? `${e.target.value}T23:59:59.999Z` : null })
                  }
                />
              )}
            </Field>
          </Stack>
        </Stack>
      </Card>

      {trail.status === 'loading' && trail.entries.length === 0 ? (
        <Skeleton lines={4} height="32px" label={t.states.loading} />
      ) : null}

      {trail.status === 'error' && trail.error ? (
        <ErrorState
          title={t.auditLog.errorTitle}
          body={t.errors[trail.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={trail.reload}
          retryLabel={t.states.retry}
        />
      ) : null}

      {trail.status === 'success' && trail.entries.length === 0 ? (
        <EmptyState title={t.auditLog.emptyTitle} body={t.auditLog.emptyBody} />
      ) : null}

      {trail.entries.length > 0 ? (
        <ol className="audit-log">
          {trail.entries.map((entry) => (
            <li className="audit-log__entry" key={entry.id}>
              {/* One sentence module, shared with the ticket history. A second
                  mapping here would be two places deciding what a verb means,
                  and the first one to change would change on one screen. */}
              <Text>{historySentence(entry, { t, nameOf })}</Text>
              <Text variant="muted">
                {formatDate(entry.at, { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
              <Text variant="muted">
                <Isolated>{`${t.auditEntities[entry.entity as keyof typeof t.auditEntities] ?? entry.entity} · ${entry.entityId}`}</Isolated>
              </Text>
            </li>
          ))}
        </ol>
      ) : null}

      {trail.page && trail.page.total > trail.page.limit ? (
        <Stack direction="row" gap={2} align="start">
          <Button
            variant="secondary"
            disabled={trail.offset === 0}
            onClick={() => trail.set({ offset: String(Math.max(0, trail.offset - trail.limit)) })}
          >
            {t.auditLog.newer}
          </Button>
          <Button
            variant="secondary"
            disabled={!trail.hasMore}
            onClick={() => trail.set({ offset: String(trail.offset + trail.limit) })}
          >
            {t.auditLog.older}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
