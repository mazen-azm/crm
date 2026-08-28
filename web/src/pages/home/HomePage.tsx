import { useAuth } from '../../app/auth-context';
import { useTranslation } from '../../shared/i18n';
import { Button, Heading, Stack } from '../../shared/ui';

// The authenticated landing. Feature screens mount around this in their own
// stories; today it proves the guard lets someone through and that a screen
// composes from primitives alone.
export function HomePage() {
  const { signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <Stack as="main" gap={5}>
      <Heading level={1}>{t.home.heading}</Heading>
      <Stack direction="row" gap={2} align="start">
        <Button variant="secondary" onClick={signOut}>
          {t.home.signOut}
        </Button>
      </Stack>
    </Stack>
  );
}
