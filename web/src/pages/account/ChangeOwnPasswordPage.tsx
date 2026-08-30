import { useState } from 'react';

import { Button, Card, ErrorState, Field, Heading, Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useChangeOwnPassword } from './useChangeOwnPassword';

const BLANK = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangeOwnPasswordPage() {
  const { t } = useTranslation();
  const change = useChangeOwnPassword();
  const [form, setForm] = useState(BLANK);
  const [mismatch, setMismatch] = useState(false);

  const set = <K extends keyof typeof BLANK>(key: K, value: string) => {
    setMismatch(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const busy = change.status === 'loading';
  const failed = change.status === 'error' ? change.error : null;

  // 401 marks the current-password field, and this screen decides that from
  // the STATUS rather than from a `fields` array — the API sends none with a
  // 401, and every other screen in this app marks from `fields`. A reader will
  // assume this one does too, so it says otherwise here.
  //
  // And the sentence is this screen's own, not t.errors.UNAUTHENTICATED. That
  // one reads "Your session has ended. Sign in again to continue," which is
  // true of every other 401 in the product and false of this one: the session
  // is fine, the password was wrong. Telling somebody to sign in again while
  // they are signed in is worse than saying nothing.
  const wrongCurrent = failed?.status === 401;
  // 422 names its field, the way everywhere else does.
  const marked = (field: string) =>
    failed?.fields?.includes(field) ? t.errors.VALIDATION_FAILED : undefined;

  if (change.status === 'success') {
    return (
      <Stack gap={4}>
        <Heading level={1}>{t.account.passwordTitle}</Heading>
        <Card>
          <Stack gap={2}>
            <Text>{t.account.passwordChanged}</Text>
            {/* Said plainly, because the opposite is what people expect: the
                token was issued against the old password and still works, so
                nobody is signed out by doing this. */}
            <Text variant="muted">{t.account.passwordStillSignedIn}</Text>
          </Stack>
        </Card>
        <Button
          variant="secondary"
          onClick={() => {
            setForm(BLANK);
            change.reset();
          }}
        >
          {t.account.passwordAgain}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level={1}>{t.account.passwordTitle}</Heading>
      <Text variant="muted">{t.account.passwordSubtitle}</Text>

      {failed && !wrongCurrent && !failed.fields?.length ? (
        <ErrorState
          title={t.account.passwordFailed}
          body={t.errors[failed.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
        />
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          // Checked here and nowhere else, because the API cannot check it:
          // it never sees the second copy. Without it, a mistyped new password
          // is accepted, and the person who typed it is locked out of an
          // account they were in a moment ago — the one mistake on this screen
          // that a person cannot undo themselves.
          if (form.newPassword !== form.confirmPassword) {
            setMismatch(true);
            return;
          }
          change.submit({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          });
        }}
      >
        <Stack gap={3}>
          <Field
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            label={t.account.passwordCurrent}
            value={form.currentPassword}
            error={wrongCurrent ? t.account.passwordWrongCurrent : marked('currentPassword')}
            onChange={(event) => set('currentPassword', event.target.value)}
          />
          <Field
            id="newPassword"
            type="password"
            autoComplete="new-password"
            label={t.account.passwordNew}
            value={form.newPassword}
            error={marked('newPassword')}
            onChange={(event) => set('newPassword', event.target.value)}
          />
          <Field
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            label={t.account.passwordConfirm}
            value={form.confirmPassword}
            error={mismatch ? t.account.passwordMismatch : undefined}
            onChange={(event) => set('confirmPassword', event.target.value)}
          />

          <Button type="submit" disabled={busy}>
            {busy ? t.account.passwordSubmitting : t.account.passwordSubmit}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
