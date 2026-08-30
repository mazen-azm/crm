import { Skeleton, Stack, Text } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useMe } from '../../shared/session/use-me';
import { MyTicketsPage } from '../portal/MyTicketsPage';

// Only this screen's content. The heading, the sign-out button and the
// navigation moved to the desk shell, which every authenticated screen renders
// inside — that is the point of the shell, and it is why the second desk
// screen will be this small too.
//
// as="section", not as="main": the shell already owns the <main> landmark and
// a document with two of them has none that means anything.
export function HomePage() {
  const { t } = useTranslation();
  const { isStaff } = useMe();

  // The root is where signing in lands, and it lands two different people.
  // A customer's own tickets are their whole reason for having an account —
  // PORTAL-2-WEB's first criterion is that they land on them rather than on
  // the desk's dashboard — so the root resolves by role instead of adding a
  // second landing route and a redirect that both have to agree about.
  //
  // Undefined until we know: a skeleton rather than the desk's page, because
  // showing a customer the desk for the length of one request and taking it
  // away is worse than showing them nothing for the same moment.
  if (isStaff === undefined) return <Skeleton lines={3} height="64px" label={t.states.loading} />;
  if (!isStaff) return <MyTicketsPage />;

  return (
    <Stack as="section" gap={4}>
      <Text>{t.home.heading}</Text>
    </Stack>
  );
}
