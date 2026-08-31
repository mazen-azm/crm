import type { ReactNode } from 'react';

import { UnreadProvider } from '../shared/session/unread-context';
import { useMe } from '../shared/session/use-me';

// The provider, told whether there is anybody to count for.
//
// It sits here rather than inside the provider itself so that `shared/` does
// not have to know what a role is: the count is a number about the signed-in
// person, and WHO may have notifications is a product rule this layer already
// reads through `useMe`. Nothing writes one for a customer, so asking on their
// behalf would be a request that is refused on every screen they open.
export function UnreadNotifications({ children }: { children: ReactNode }) {
  const { isStaff } = useMe();
  return <UnreadProvider enabled={isStaff === true}>{children}</UnreadProvider>;
}
