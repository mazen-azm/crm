import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { setAuthTokenGetter, setUnauthenticatedHandler } from '../shared/api/client';

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

  const signIn = useCallback((next: string) => {
    try {
      globalThis.localStorage?.setItem(AUTH_TOKEN_KEY, next);
    } catch {
      // Signed in for this tab only; the reload will not remember it.
    }
    setSessionEnded(false);
    setToken(next);
  }, []);

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
    setAuthTokenGetter(() => token);

    setUnauthenticatedHandler(() => {
      // Idempotent on purpose. A screen with three requests in flight gets
      // three 401s from one dead token; clearing three times and navigating
      // three times is a flicker at best. Whoever arrives first does the work.
      if (tokenRef.current === null) return;
      tokenRef.current = null;
      setSessionEnded(true);
      forget();
    });

    // Both handlers are module-level variables, so a provider that goes away
    // without unregistering leaves one behind pointing at a component nobody
    // renders — a warning in the app, and in the suite a handler from an
    // earlier test firing during a later one, since every render mounts a
    // fresh provider against the same module.
    return () => {
      setAuthTokenGetter(() => null);
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
