import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './require-auth';
import { DeskShell } from './desk-shell';
import { SignInPage } from '../pages/sign-in/SignInPage';
import { HomePage } from '../pages/home/HomePage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { CustomerScreenPage } from '../pages/customers/CustomerScreenPage';
import { AddCustomerPage } from '../pages/customers/AddCustomerPage';
import { ChangeOwnPasswordPage } from '../pages/account/ChangeOwnPasswordPage';
import { SetUserPasswordPage } from '../pages/accounts/SetUserPasswordPage';
import { PublicRaiseTicketPage } from '../pages/portal/PublicRaiseTicketPage';
import { PortalTicketPage } from '../pages/portal/PortalTicketPage';
import { RaiseTicketPage } from '../pages/tickets/RaiseTicketPage';
import { TicketQueuePage } from '../pages/tickets/TicketQueuePage';

// Routes import pages; nothing imports routes. The direction is
// app -> pages -> features -> entities -> shared, and PLATFORM-15-ALL will
// enforce it with a script.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      {/* The one screen a stranger sees. Outside RequireAuth and outside
          DeskShell, for the reason sign-in is: there is no session, and the
          desk's navigation would offer four screens they cannot open. */}
      <Route path="/raise" element={<PublicRaiseTicketPage />} />
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
      {/* Admin-only in the API. The route is not gated here beyond RequireAuth:
          the screen says so for a non-admin who arrives, and the refusal that
          matters is the API's (SC-2). A router-level role gate would be a
          second place deciding one rule. */}
      <Route
        path="/accounts/set-password"
        element={
          <RequireAuth>
            <DeskShell>
              <SetUserPasswordPage />
            </DeskShell>
          </RequireAuth>
        }
      />
      {/* A customer's own ticket. Behind RequireAuth and inside the shell,
          like every other signed-in screen: the shell's navigation offers the
          screens the reader may open, and a customer's set is smaller rather
          than absent. The screen resolves the id — it is not handed a ticket
          by whatever linked to it, so the link can be shared and reloaded. */}
      <Route
        path="/portal/tickets/:id"
        element={
          <RequireAuth>
            <DeskShell>
              <PortalTicketPage />
            </DeskShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
