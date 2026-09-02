import { useState } from 'react';

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
import { ACCOUNT_STATES, useAccounts } from './useAccounts';
import type { Account, AccountState } from './useAccounts';
import { useCreateAccount, useDisableAccount, useReEnableAccount } from './useManageAccounts';
import './AccountsPage.css';

// The roles an admin hands out here, and only those. STAFF_ROLES in
// api/src/features/identity/identity.rules.js:106 is the authority: `customer`
// is a real role and is not one this route creates, so offering it would teach
// a rule that is not true and earn a 422 for the person who believed it.
const ROLES = ['agent', 'admin'] as const;

export function AccountsPage() {
  const { t } = useTranslation();
  const { formatDate, countOf } = useFormatters();
  const { isAdmin } = useMe();
  // Not until we know. `isAdmin` is undefined while /me is in flight, and a
  // request fired then would be refused for somebody who turns out to be an
  // admin a moment later — a 403 in the audit log for nothing anybody did
  // (L-63).
  const list = useAccounts({ enabled: isAdmin === true });

  const creating = useCreateAccount();
  const disabling = useDisableAccount();
  const reEnabling = useReEnableAccount();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('agent');
  // Which row a write is happening on, so a failure marks that row rather than
  // the list. The same reason useManageCategories keeps its states apart.
  const [busyId, setBusyId] = useState<string | null>(null);

  // Courtesy, not enforcement: the API refuses a non-admin whatever this draws
  // (SC-2). Undefined until /me answers, so nothing flashes.
  if (isAdmin === false) {
    return <EmptyState title={t.accounts.adminOnlyTitle} body={t.accounts.adminOnlyBody} />;
  }

  const sentenceFor = (code: string) =>
    t.errors[code as keyof typeof t.errors] ?? t.errors.INTERNAL;

  const roleLabel = (value: string) =>
    value === 'admin' ? t.accounts.roleAdmin : value === 'agent' ? t.accounts.roleAgent : value;

  const stateLabelFor = (account: Account) =>
    account.deletedAt === null ? t.accounts.stateLive : t.accounts.stateDisabled;

  const showLabel: Record<AccountState, string> = {
    live: t.accounts.showLive,
    disabled: t.accounts.showDisabled,
    all: t.accounts.showAll,
  };

  const submit = async () => {
    try {
      await creating.create({ email, name, role });
      setName('');
      setEmail('');
      setRole('agent');
      list.reload();
    } catch {
      // The hook holds the failure; the panel below renders it.
    }
  };

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      list.reload();
    } catch {
      // Held by the acting hook and rendered against the row.
    } finally {
      setBusyId(null);
    }
  };

  const created = creating.created;

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.accounts.title}</Heading>

      {/* The password panel replaces the form while it is up. It is the only
          moment this value exists: the API mints it, answers with it once, and
          keeps nothing but its hash. It is written to no storage, no address
          and no console — the audit row for user.create deliberately holds
          neither the password nor its hash (identity.service.js:99-101), and a
          screen that wrote it somewhere readable would undo that. */}
      {created ? (
        <Card>
          <Stack gap={2}>
            {/* Not a Heading: the primitive offers h1 and h2 only, by design,
                and the page already owns its h2. These are sentences inside a
                card, so they are read as sentences. */}
            <Text>{t.accounts.passwordTitle}</Text>
            <Text variant="muted">
              {t.accounts.passwordFor} <Isolated>{created.user.email}</Isolated>
            </Text>
            <Text>{t.accounts.passwordLabel}</Text>
            {/* Isolated so the direction of the surrounding language cannot
                reorder it. A password is a token, not prose. */}
            <Text><Isolated><code className="accounts__password">{created.initialPassword}</code></Isolated></Text>
            <Text>{t.accounts.passwordRead}</Text>
            <Text variant="muted">{t.accounts.passwordLost}</Text>
            <Stack direction="row" gap={2} align="start">
              <CopyPassword value={created.initialPassword} />
              <Button variant="secondary" onClick={creating.reset}>{t.accounts.passwordDone}</Button>
            </Stack>
          </Stack>
        </Card>
      ) : (
        <Card>
          <Stack gap={2}>
            <Text>{t.accounts.addTitle}</Text>
            <Field id="account-name" label={t.accounts.addName}>
              {({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field id="account-email" label={t.accounts.addEmail}>
              {({ id }) => (
                <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <Field id="account-role" label={t.accounts.addRole}>
              {({ id }) => (
                <Select id={id} value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((each) => (
                    <option key={each} value={each}>{roleLabel(each)}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Stack direction="row" gap={2} align="start">
              <Button onClick={submit} disabled={creating.status === 'loading'}>
                {creating.status === 'loading' ? t.accounts.adding : t.accounts.add}
              </Button>
            </Stack>
            {creating.error ? (
              <ErrorState
                title={t.accounts.addFailed}
                body={sentenceFor(creating.error.code)}
              />
            ) : null}
          </Stack>
        </Card>
      )}

      {/* Said after every disable, including when the answer is none. The API
          returns the count beside the user so an admin can see what happened
          to the work; dropping it here is where that care would be lost. */}
      {disabling.disabled ? (
        <Text>
          {disabling.disabled.unassigned === 0
            ? t.accounts.unassignedNone
            : countOf(disabling.disabled.unassigned, t.accounts)}
        </Text>
      ) : null}

      <Card>
        <Field id="accounts-state" label={t.accounts.showLabel}>
          {({ id }) => (
            <Select
              id={id}
              value={list.state}
              onChange={(e) => list.set({ state: e.target.value as AccountState })}
            >
              {ACCOUNT_STATES.map((each) => (
                <option key={each} value={each}>{showLabel[each]}</option>
              ))}
            </Select>
          )}
        </Field>
      </Card>

      {list.status === 'loading' && list.accounts.length === 0 ? (
        <Skeleton lines={4} height="32px" label={t.states.loading} />
      ) : null}

      {list.status === 'error' && list.error ? (
        <ErrorState
          title={t.accounts.errorTitle}
          body={sentenceFor(list.error.code)}
          onRetry={list.reload}
          retryLabel={t.states.retry}
        />
      ) : null}

      {list.status === 'success' && list.accounts.length === 0 ? (
        <EmptyState
          title={list.state === 'disabled' ? t.accounts.emptyDisabledTitle : t.accounts.emptyLiveTitle}
          body={list.state === 'disabled' ? t.accounts.emptyDisabledBody : t.accounts.emptyLiveBody}
        />
      ) : null}

      {list.accounts.length > 0 ? (
        <table className="accounts">
          <thead>
            <tr>
              <th>{t.accounts.nameColumn}</th>
              <th>{t.accounts.emailColumn}</th>
              <th>{t.accounts.roleColumn}</th>
              <th>{t.accounts.stateColumn}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.accounts.map((account) => (
              <tr key={account.id}>
                {/* A person's own name, untranslated. */}
                <td>{account.name}</td>
                <td><Isolated>{account.email}</Isolated></td>
                <td>{roleLabel(account.role)}</td>
                <td>
                  {stateLabelFor(account)}
                  {account.deletedAt ? (
                    <Text variant="muted">{formatDate(account.deletedAt, { dateStyle: 'medium' })}</Text>
                  ) : null}
                </td>
                <td>
                  {account.deletedAt === null ? (
                    <Button
                      variant="secondary"
                      disabled={busyId === account.id}
                      onClick={() => run(account.id, () => disabling.disable(account.id))}
                    >
                      {busyId === account.id ? t.accounts.disabling : t.accounts.disable}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={busyId === account.id}
                      onClick={() => run(account.id, () => reEnabling.reEnable(account.id))}
                    >
                      {busyId === account.id ? t.accounts.reEnabling : t.accounts.reEnable}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {/* Each refusal says which rule refused it. The API gives them their own
          codes — LAST_ADMIN, ALREADY_DISABLED, ALREADY_LIVE, EMAIL_TAKEN — so
          "something went wrong" never has to stand in for four different
          facts. */}
      {disabling.error ? (
        <ErrorState title={t.accounts.disableFailed} body={sentenceFor(disabling.error.code)} />
      ) : null}
      {reEnabling.error ? (
        <ErrorState title={t.accounts.reEnableFailed} body={sentenceFor(reEnabling.error.code)} />
      ) : null}

      {list.page && list.page.total > list.page.limit ? (
        <Stack direction="row" gap={2} align="start">
          <Button
            variant="secondary"
            disabled={list.offset === 0}
            onClick={() => list.set({ offset: String(Math.max(0, list.offset - list.limit)) })}
          >
            {t.accounts.newer}
          </Button>
          <Button
            variant="secondary"
            disabled={!list.hasMore}
            onClick={() => list.set({ offset: String(list.offset + list.limit) })}
          >
            {t.accounts.older}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

// The clipboard write is the one place this value leaves the page, and it
// happens only because somebody pressed a button. When the browser refuses —
// a permission, an insecure origin — the password is still on the screen to be
// read out, so the failure is a sentence rather than a dead end.
function CopyPassword({ value }: { value: string }) {
  const { t } = useTranslation();
  const [said, setSaid] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setSaid('copied');
    } catch {
      setSaid('failed');
    }
  };

  return (
    <Stack gap={1}>
      <Button variant="secondary" onClick={copy}>{t.accounts.passwordCopy}</Button>
      {said === 'copied' ? <Text variant="muted">{t.accounts.passwordCopied}</Text> : null}
      {said === 'failed' ? <Text variant="muted">{t.accounts.passwordCopyFailed}</Text> : null}
    </Stack>
  );
}
