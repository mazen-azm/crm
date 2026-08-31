import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { setAuthTokenGetter, setTokenReplacedHandler, setUnauthenticatedHandler } from '../shared/api/client';

// The token stored here is what the API issued. It is read synchronously on
// the first render rather than in an effect, which is what makes a reload keep
// the session instead of flashing sign-in and navigating back to it.
const AUTH_TOKEN_KEY = 'support-desk.auth-token';

type AuthValue = {
  token: string | null;
  isAuthenticated: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
  // True only when the API stopped accepting our token — never when somebody
  // pressed the sign-out button. Clicking sign out and being told your session
  // expired is a lie about what just happened.
  sessionEnded: boolean;
  dismissSessionEnded: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function readStoredToken(): string | null {
  // Storage can throw: a private window, a browser with site data blocked, or
  // a runtime whose localStorage global is a stub. A visitor who cannot store
  // a session is simply signed out, never a blank screen.
  try {
    return globalThis.localStorage?.getItem(AUTH_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read synchronously on the first render — this is what makes a reload keep
  // the session instead of flashing sign-in and navigating back.
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [sessionEnded, setSessionEnded] = useState(false);

  // The handler below runs outside React's render, so it cannot read `token`
  // from a closure without risking a stale one. A ref that mirrors the state
  // is what makes the "already signed out" check honest.
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // Registered during RENDER, not in an effect. React runs effects child-first,
  // so a page's data effect fires before this provider's effect could have
  // registered anything — which meant every request on a fresh load or a
  // reload went out with no Authorization header, came back 401, was read as
  // an expired session, and signed the reader out. Reloading any screen logged
  // you out, and no test saw it because page stubs answer 200 whatever headers
  // arrive.
  //
  // It reads through the ref rather than the closure so it is always current
  // without needing to re-register, and it is idempotent: calling it on every
  // render costs an assignment.
  setAuthTokenGetter(() => tokenRef.current);

  const signIn = useCallback((next: string) => {
    try {
      globalThis.localStorage?.setItem(AUTH_TOKEN_KEY, next);
    } catch {
      // Signed in for this tab only; the reload will not remember it.
    }
    setSessionEnded(false);
    setToken(next);
  }, []);

  // What to do when a call answers with a token that REPLACES the one being
  // held — a password change ends every session issued before it, this one
  // included, so its answer carries the successor. Storing a token is this
  // context's job; the hook that receives it only announces, because a hook
  // under pages/ reaching up to app/ is a layer violation the architecture
  // check fails by name.
  //
  // Registered during render like the getter above, and for the same reason:
  // an effect here runs after the pages' effects, and a token announced before
  // registration would be dropped.
  setTokenReplacedHandler(signIn);

  // The clearing half, without the "your session ended" half. Pressing the
  // button and the token expiring both end up here; only one of them should
  // say anything about it on the next screen.
  const forget = useCallback(() => {
    try {
      globalThis.localStorage?.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Nothing stored means nothing to remove.
    }
    setToken(null);
  }, []);

  // What the header button calls. Same clearing, and it explicitly puts the
  // banner down: you chose to leave, nothing expired on you.
  const signOut = useCallback(() => {
    setSessionEnded(false);
    forget();
  }, [forget]);

  const dismissSessionEnded = useCallback(() => setSessionEnded(false), []);

  // The HTTP client asks for the token rather than importing this module, so
  // it stays free of React and usable from anywhere.
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      // Idempotent on purpose. A screen with three requests in flight gets
      // three 401s from one dead token; clearing three times and navigating
      // three times is a flicker at best. Whoever arrives first does the work.
      if (tokenRef.current === null) return;
      tokenRef.current = null;
      setSessionEnded(true);
      forget();
    });

    // Only the handler is unregistered here. It is a module-level variable, so
    // a provider that goes away without clearing it leaves one behind pointing
    // at a component nobody renders — in the suite, a handler from an earlier
    // test firing during a later one.
    //
    // The token getter is deliberately NOT cleared. It used to be, and that
    // undid the render-time registration above: StrictMode mounts twice, so
    // the first mount's cleanup ran AFTER the second mount had registered, and
    // the second mount's requests went out unauthenticated. The symptom was a
    // reload that signed you out with one request succeeding and the rest
    // failing — visible only in a browser, because no stub cares about
    // headers. A fresh provider overwrites the getter during its own render,
    // which is the isolation the suite actually needs.
    return () => {
      setUnauthenticatedHandler(() => {});
    };
  }, [token]);

  const value = useMemo<AuthValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      sessionEnded,
      signIn,
      signOut,
      dismissSessionEnded,
    }),
    [token, sessionEnded, signIn, signOut, dismissSessionEnded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth() was called outside AuthProvider');
  return value;
}

export { AUTH_TOKEN_KEY };
