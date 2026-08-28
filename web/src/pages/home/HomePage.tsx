import { Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';

// Only this screen's content. The heading, the sign-out button and the
// navigation moved to the desk shell, which every authenticated screen renders
// inside — that is the point of the shell, and it is why the second desk
// screen will be this small too.
//
// as="section", not as="main": the shell already owns the <main> landmark and
// a document with two of them has none that means anything.
export function HomePage() {
  const { t } = useTranslation();
  return (
    <Stack as="section" gap={4}>
      <Text>{t.home.heading}</Text>
    </Stack>
  );
}
