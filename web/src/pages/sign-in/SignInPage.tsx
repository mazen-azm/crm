import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/auth-context';
import { useTranslation } from '../../shared/i18n';
import { Button, Card, Field, Heading, Stack, Text } from '../../shared/ui';

// Assembled from primitives: no spacing, radius or type scale is restated
// here. Designed empty, loading and error states are PLATFORM-16-WEB.
export function SignInPage() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // No network call. IDENTITY-1-API (CRM-41) replaces this with a token the
    // API issues; the context and the guard around it stay as they are.
    signIn('stub-token');
    navigate('/', { replace: true });
  }

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
            onChange={(e) => setEmail(e.target.value)}
          />

          <Field
            id="password"
            label={t.signIn.passwordLabel}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit">{t.signIn.submit}</Button>
          <Text variant="muted">{t.signIn.stubNotice}</Text>
        </Stack>
      </Card>
    </Stack>
  );
}
