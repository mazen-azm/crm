import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { setAuthTokenGetter } from '../shared/api/client';

// The token stored here is what the API issued. It is read synchronously on
// the first render rather than in an effect, which is what makes a reload keep
// the session instead of flashing sign-in and navigating back to it.
const AUTH_TOKEN_KEY = 'support-desk.auth-token';

type AuthValue = {
  token: string | null;
  isAuthenticated: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
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

  const signIn = useCallback((next: string) => {
    try {
      globalThis.localStorage?.setItem(AUTH_TOKEN_KEY, next);
    } catch {
      // Signed in for this tab only; the reload will not remember it.
    }
    setToken(next);
  }, []);

  const signOut = useCallback(() => {
    try {
      globalThis.localStorage?.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Nothing stored means nothing to remove.
    }
    setToken(null);
  }, []);

  // The HTTP client asks for the token rather than importing this module, so
  // it stays free of React and usable from anywhere.
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const value = useMemo<AuthValue>(
    () => ({ token, isAuthenticated: Boolean(token), signIn, signOut }),
    [token, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth() was called outside AuthProvider');
  return value;
}

export { AUTH_TOKEN_KEY };
