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
import { useAgentLoad } from './useAgentLoad';
import './AgentLoadPage.css';

export function AgentLoadPage() {
  const { t } = useTranslation();
  const { formatNumber } = useFormatters();
  const { isAdmin } = useMe();
  const report = useAgentLoad({ enabled: isAdmin === true });
  const page = report.report;

  if (isAdmin === false) {
    return <EmptyState title={t.agentLoadReport.adminOnlyTitle} body={t.agentLoadReport.adminOnlyBody} />;
  }

  const roleLabel = (role: string) =>
    role === 'admin' ? t.agentLoadReport.roleAdmin : t.agentLoadReport.roleAgent;

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.agentLoadReport.title}</Heading>

      {report.status === 'loading' && !page ? (
        <Skeleton lines={4} height="24px" label={t.states.loading} />
      ) : null}

      {report.status === 'error' && report.error ? (
        <ErrorState
          title={t.agentLoadReport.errorTitle}
          body={t.errors[report.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={report.reload}
          retryLabel={t.states.retry}
        />
      ) : null}

      {page ? (
        <>
          {/* Work nobody has taken, in its own card and never a row among the
              people: a name in a list of people is a person, and this is the
              figure an admin most needs to see. */}
          <Card>
            <Stack gap={1}>
              <Text variant="muted">{t.agentLoadReport.unassignedLabel}</Text>
              <Text><Isolated>{formatNumber(page.unassigned)}</Isolated></Text>
              <Text variant="muted">
                {t.agentLoadReport.openLabel} <Isolated>{formatNumber(page.open)}</Isolated>
              </Text>
              {/* Absent when the numbers add up, which is almost always. A
                  figure that appears only when something is wrong is read; one
                  that always says zero is not. It means a ticket is held by
                  somebody this report does not list. */}
              {page.unaccounted !== 0 ? (
                <Text>
                  {t.agentLoadReport.unaccountedLabel}{' '}
                  <Isolated>{formatNumber(page.unaccounted)}</Isolated>
                </Text>
              ) : null}
            </Stack>
          </Card>

          {page.agents.length === 0 ? (
            <EmptyState title={t.agentLoadReport.noAgentsTitle} body={t.agentLoadReport.noAgentsBody} />
          ) : (
            <Card>
              <ul className="agent-load">
                {page.agents.map((agent) => (
                  <li className="agent-load__row" key={agent.id}>
                    {/* The person's own name, as stored. Only the label around
                        it is translated. */}
                    <span className="agent-load__who">
                      {agent.name}
                      <Text variant="muted">{roleLabel(agent.role)}</Text>
                    </span>
                    {/* Every agent has a row, and an idle one says zero in the
                        same shape a busy one does. The list is never cut to a
                        top few: the person holding nothing is who this report
                        is for. */}
                    <span className="agent-load__count">{formatNumber(agent.load)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      ) : null}
    </Stack>
  );
}
