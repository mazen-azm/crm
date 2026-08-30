import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './require-auth';
import { DeskShell } from './desk-shell';
import { SignInPage } from '../pages/sign-in/SignInPage';
import { HomePage } from '../pages/home/HomePage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { CustomerScreenPage } from '../pages/customers/CustomerScreenPage';
import { AddCustomerPage } from '../pages/customers/AddCustomerPage';
import { ChangeOwnPasswordPage } from '../pages/account/ChangeOwnPasswordPage';
import { RaiseTicketPage } from '../pages/tickets/RaiseTicketPage';
import { TicketQueuePage } from '../pages/tickets/TicketQueuePage';

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
      <Route
        path="/customers"
        element={
          <RequireAuth>
            <DeskShell>
              <CustomersPage />
            </DeskShell>
          </RequireAuth>
        }
      />
      {/* Before /customers/:id, though the router does not need it to be:
          react-router ranks a literal segment above a dynamic one whatever the
          order. Written first because a reader ranks them by order, and a test
          pins the behaviour rather than the position. */}
      <Route
        path="/customers/new"
        element={
          <RequireAuth>
            <DeskShell>
              <AddCustomerPage />
            </DeskShell>
          </RequireAuth>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <RequireAuth>
            <DeskShell>
              <CustomerScreenPage />
            </DeskShell>
          </RequireAuth>
        }
      />
      <Route
        path="/tickets"
        element={
          <RequireAuth>
            <DeskShell>
              <TicketQueuePage />
            </DeskShell>
          </RequireAuth>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <RequireAuth>
            <DeskShell>
              <RaiseTicketPage />
            </DeskShell>
          </RequireAuth>
        }
      />
      {/* Your own account, whoever you are. Not staff-only and not
          admin-only: the API's route for this takes any signed-in subject,
          because an admin changing their own password makes the same call an
          agent or a customer does. */}
      <Route
        path="/account/password"
        element={
          <RequireAuth>
            <DeskShell>
              <ChangeOwnPasswordPage />
            </DeskShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
