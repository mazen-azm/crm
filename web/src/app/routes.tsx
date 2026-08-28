import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './require-auth';
import { DeskShell } from './desk-shell';
import { SignInPage } from '../pages/sign-in/SignInPage';
import { HomePage } from '../pages/home/HomePage';

// Routes import pages; nothing imports routes. The direction is
// app -> pages -> features -> entities -> shared, and PLATFORM-15-ALL will
// enforce it with a script.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route
        path="/"
        element={
          // The shell sits INSIDE RequireAuth, so an unauthenticated
          // visitor is redirected before a navigation bar can render.
          // Sign-in is deliberately not wrapped: it has nothing to navigate
          // to and nobody to greet.
          <RequireAuth>
            <DeskShell>
              <HomePage />
            </DeskShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
