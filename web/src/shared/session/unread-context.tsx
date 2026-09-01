import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { request } from '../api/client';

// How many notifications the signed-in person has not read.
//
// A context because two distant things need one number: the shell draws a
// badge on every screen, and the notifications page changes the number by
// marking one read. Passing it between them would mean threading it through
// the router.
//
// In `shared/session/` beside `use-me.ts`, for the reason that file gives for
// its own location: the shell and the pages both read it, and a module the
// shell depends on for chrome it draws everywhere does not belong inside one
// page's folder.
//
// Nothing polls. The count is what the last read said, and a story that wants
// it live can ask for one — `NOTIFICATIONS-2-WEB`'s criteria say so.
type Unread = {
  count: number;
  // Told rather than re-fetched: the write answers with the notification it
  // changed, so the page knows one fewer is unread without asking again.
  markedOne: () => void;
  refresh: () => void;
};

const UnreadContext = createContext<Unread>({ count: 0, markedOne: () => {}, refresh: () => {} });

export function UnreadProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    // `limit=1` because only the number is wanted here. The list itself is the
    // page's business, and asking for twenty rows to read one integer would be
    // a request that grows with somebody's backlog.
    if (!enabled) { setCount(0); return; }
    request<{ unread: number }>('/me/notifications?limit=1')
      .then(({ unread }) => setCount(unread))
      // A badge that could not be fetched is not an error worth showing. It is
      // chrome, and the screens it sits above have their own failures to
      // report.
      .catch(() => {});
  }, [enabled]);

  useEffect(refresh, [refresh]);

  const value = useMemo(
    () => ({ count, markedOne: () => setCount((held) => Math.max(0, held - 1)), refresh }),
    [count, refresh],
  );

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): Unread {
  return useContext(UnreadContext);
}
