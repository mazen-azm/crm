import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/auth-context';
import { useTranslation } from '../../shared/i18n';
import { useRequest } from '../../shared/hooks';
import { request } from '../../shared/api/client';
import { Button, Card, Field, Heading, Stack, Text } from '../../shared/ui';
import type { Messages } from '../../shared/i18n/en';

type SignInResponse = { token: string; user: { id: string; role: string; name: string } };

// The screen shows the code the API gave, translated in the resource files
// rather than in this file. Designed empty, loading and error states as a
// system are PLATFORM-16-WEB.
// Sign-in does NOT read t.errors, and that is deliberate — do not "simplify"
// this into the shared map.
//
// IDENTITY-1-API answers 401 UNAUTHENTICATED for a wrong password, an unknown
// address and a disabled account alike, so the response is not a directory of
// who works here; it spends a dummy hash computation keeping the timings equal
// too. One sentence covering all three is how this screen keeps that promise.
//
// t.errors.UNAUTHENTICATED says "your session has ended", which is what every
// other screen means by that code and would be a lie here. One map cannot say
// both things.
function messageFor(code: string | undefined, t: Messages): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return t.signIn.errorUnauthenticated;
    case 'VALIDATION_FAILED':
      return t.signIn.errorValidationFailed;
    case 'INTERNAL':
      return t.signIn.errorInternal;
    default:
      return t.signIn.errorUnknown;
  }
}

export function SignInPage() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { status, error, run } = useRequest<SignInResponse>();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const { token } = await run(() =>
        request<SignInResponse>('/sign-in', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }),
      );
      // The API's token, verbatim. Nothing here invents one.
      signIn(token);
      navigate('/', { replace: true });
    } catch {
      // A refused password must not sit in the field waiting to be sent again.
      // run() has already recorded the failure; there is nothing to add.
      setPassword('');
    }
  }

  const busy = status === 'loading';

  return (
    <Stack as="main" gap={5}>
      <Card>
        <Stack as="form" gap={4} {...{ onSubmit }}>
          <Heading level={1}>{t.signIn.heading}</Heading>

          <Field
            id="email"
            label={t.signIn.emailLabel}
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Field
            id="password"
            label={t.signIn.passwordLabel}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" disabled={busy}>
            {busy ? t.signIn.submitting : t.signIn.submit}
          </Button>

          {error ? <Text variant="muted">{messageFor(error.code, t)}</Text> : null}
        </Stack>
      </Card>
    </Stack>
  );
}
