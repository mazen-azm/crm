import { useState } from 'react';

import { Button, Card, ErrorState, Field, Heading, Isolated, Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useMe } from '../../shared/session/use-me';
import { useSetUserPassword } from './useSetUserPassword';

const BLANK = { userId: '', password: '', confirmPassword: '' };

export function SetUserPasswordPage() {
  const { t } = useTranslation();
  const { isAdmin } = useMe();
  const set = useSetUserPassword();
  const [form, setForm] = useState(BLANK);
  const [mismatch, setMismatch] = useState(false);

  const put = <K extends keyof typeof BLANK>(key: K, value: string) => {
    setMismatch(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const busy = set.status === 'loading';
  const failed = set.status === 'error' ? set.error : null;
  const marked = (field: string) =>
    failed?.fields?.includes(field) ? t.errors.VALIDATION_FAILED : undefined;

  // Undefined while the answer is on its way: "not an admin" and "we do not
  // know yet" are different, and drawing the refusal for the second one tells
  // an admin they are not one for as long as a request takes.
  if (isAdmin === false) {
    return (
      <Stack gap={4}>
        <Heading level={1}>{t.setPassword.title}</Heading>
        {/* Courtesy, not enforcement. SC-2 puts every rule in the API, and it
            refuses a non-admin whether or not this screen drew the form. */}
        <Text variant="muted">{t.setPassword.adminOnly}</Text>
      </Stack>
    );
  }

  if (set.status === 'success' && set.done) {
    return (
      <Stack gap={4}>
        <Heading level={1}>{t.setPassword.title}</Heading>
        <Card>
          <Stack gap={2}>
            <Text>{t.setPassword.done}</Text>
            {/* WHICH account. A confirmation that does not name it is a
                confirmation you cannot check, and this is the screen for
                somebody handling several locked-out people at once. */}
            <Text variant="muted">{t.setPassword.doneFor}</Text>
            <Text>
              <Isolated>{set.done.id}</Isolated>
            </Text>
            <Text variant="muted">{t.setPassword.doneRead}</Text>
          </Stack>
        </Card>
        <Button
          variant="secondary"
          onClick={() => {
            setForm(BLANK);
            set.reset();
          }}
        >
          {t.setPassword.another}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level={1}>{t.setPassword.title}</Heading>
      <Text variant="muted">{t.setPassword.subtitle}</Text>

      {failed && !failed.fields?.length ? (
        <ErrorState
          title={t.setPassword.failed}
          body={t.errors[failed.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          // The API never sees the second copy, so it cannot check this. An
          // admin who mistypes here locks somebody out a second time, and the
          // person it happens to cannot tell the difference.
          if (form.password !== form.confirmPassword) {
            setMismatch(true);
            return;
          }
          set.submit({ userId: form.userId.trim(), password: form.password });
        }}
      >
        <Stack gap={3}>
          {/* An id typed in, not a picker: the people screen is IDENTITY-2-WEB
              and does not exist yet. The label says so rather than implying a
              search that is not here. */}
          <Field
            id="userId"
            label={t.setPassword.userId}
            value={form.userId}
            error={marked('id')}
            onChange={(event) => put('userId', event.target.value)}
          />
          <Field
            id="password"
            type="password"
            autoComplete="new-password"
            label={t.setPassword.password}
            value={form.password}
            error={marked('password')}
            onChange={(event) => put('password', event.target.value)}
          />
          <Field
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            label={t.setPassword.confirm}
            value={form.confirmPassword}
            error={mismatch ? t.setPassword.mismatch : undefined}
            onChange={(event) => put('confirmPassword', event.target.value)}
          />

          <Button type="submit" disabled={busy}>
            {busy ? t.setPassword.submitting : t.setPassword.submit}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
