import { useEffect } from 'react';

import { request } from '../api/client';
import { useRequest } from '../hooks';

// Who is signed in, as the API says it.
//
// The auth context holds a token and nothing else — deliberately: a token is
// what the client can prove, and everything it means is the API's to say.
// Until now no screen needed more than "signed in or not". Two do: an
// admin-only control should not be offered to an agent, because a control that
// always fails is the button-that-goes-nowhere defect wearing a permission;
// and the portal has to show a customer a navigation with no staff screen in
// it.
//
// It lives in shared/ and NOT in app/, because a page imports it and the layer
// direction is app -> pages -> features -> entities -> shared.
// verify-architecture caught the first draft of this file sitting in app/.
//
// It takes no auth dependency for the same reason: reading `isAuthenticated`
// would mean importing from app/, which is the carried violation SignInPage
// already has. Without a session the request is a 401 and `me` stays null,
// which is the same answer — and every caller is behind RequireAuth anyway, so
// it does not happen.
//
// It is NOT enforcement. SC-2 puts every rule in the API; this only decides
// what to draw. A screen that hid a control it had no right to would still be
// refused by the API if somebody typed the URL.
export type Me = { id: string; role: string; name: string };

export function useMe() {
  const { status, data, error, run } = useRequest<Me>();

  useEffect(() => {
    run(() => request<Me>('/me')).catch(() => {});
  }, [run]);

  return {
    status,
    error,
    me: data,
    // Undefined until the answer arrives, so a caller can tell "not an admin"
    // apart from "we do not know yet" and draw neither rather than the wrong
    // one. Drawing the refusal for an admin, even for the length of one
    // request, tells them they are not one.
    isAdmin: data ? data.role === 'admin' : undefined,
    isStaff: data ? data.role !== 'customer' : undefined,
  };
}
